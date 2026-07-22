using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using PDV.Api.Middleware;
using PDV.Application.Interfaces;
using PDV.Application.Validators.Users;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;
using PDV.Infrastructure.Repositories;
using PDV.Infrastructure.Services;
using PDV.Infrastructure.HealthChecks;
using PDV.Infrastructure.Logging;
using PDV.Infrastructure.Services.Payments.Stripe;
using PDV.Infrastructure.Storage;
using PDV.Application.Interfaces.Payments;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
// Import estreito: `using Stripe;` colidiria com ProductService/CustomerService/SubscriptionService
// próprios do PDV.
using IStripeClient = Stripe.IStripeClient;
using StripeClient = Stripe.StripeClient;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Logging estruturado (Serilog). Console para o operador; o SystemLogSink persiste os eventos
// >= Warning na tabela SystemLog, que o admin lê em /admin/observabilidade. O sink só enfileira —
// quem grava é o SystemLogWriterService (evita reentrância: o EF loga, o log gravaria no EF...).
builder.Services.AddSingleton<SystemLogQueue>();
builder.Services.AddSerilog((sp, lc) => lc
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Sink(new SystemLogSink(sp.GetRequiredService<SystemLogQueue>())));
builder.Services.AddHostedService<SystemLogWriterService>();

// Health checks — consumidos pelo /health (anônimo) e pelo /api/admin/health (detalhado).
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("mysql")
    .AddCheck<StorageHealthCheck>("storage");

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration["DB_CONNECTION_STRING"],
        ServerVersion.AutoDetect(builder.Configuration["DB_CONNECTION_STRING"]))
         .ConfigureWarnings(w => 
               w.Throw(RelationalEventId.MultipleCollectionIncludeWarning)));

// Authentication: JWT Bearer — o access_token chega via cookie HttpOnly
var jwtSecret = builder.Configuration["JWT_SECRET"]
    ?? throw new InvalidOperationException("JWT_SECRET não configurado.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            // JsonWebTokenHandler (padrão no .NET 8+) não mapeia "role" para ClaimTypes.Role
            // automaticamente — precisamos indicar qual claim no JWT representa o role.
            RoleClaimType = ClaimTypes.Role,
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("access_token", out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            },
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/problem+json";
                return ctx.Response.WriteAsync(
                    """{"type":"https://tools.ietf.org/html/rfc7807","title":"Não autenticado.","status":401}""");
            },
            OnForbidden = ctx =>
            {
                ctx.Response.ContentType = "application/problem+json";
                return ctx.Response.WriteAsync(
                    """{"type":"https://tools.ietf.org/html/rfc7807","title":"Acesso negado.","status":403}""");
            },
        };
    });

builder.Services.AddAuthorization();

// CORS — only the configured frontend origin is allowed
var frontendUrl = builder.Configuration["FRONTEND_URL"]
    ?? throw new InvalidOperationException("FRONTEND_URL não configurado.");

// Landing page (site estático separado) — só consome o endpoint público de documentos legais,
// sem cookies. Origem opcional: sem ela, o endpoint segue funcionando para chamadas same-origin/sem CORS.
var landingUrl = builder.Configuration["LANDING_URL"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());

    options.AddPolicy("PublicLegal", policy =>
    {
        if (!string.IsNullOrWhiteSpace(landingUrl))
            policy.WithOrigins(landingUrl).AllowAnyHeader().AllowAnyMethod();
    });
});

// Validators
builder.Services.AddValidatorsFromAssemblyContaining<UpdateUserRequestValidator>();

builder.Services.AddHttpContextAccessor();

// Application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IProductCategoryService, ProductCategoryService>();
builder.Services.AddScoped<ISaleService, SaleService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IDataImportService, DataImportService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserSettingsService, UserSettingsService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<ITenantRoleService, TenantRoleService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IServiceService, ServiceService>();
builder.Services.AddScoped<IServiceCategoryService, ServiceCategoryService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<IContactMessageService, ContactMessageService>();
builder.Services.AddScoped<IAuditLogger, AuditLogger>();
builder.Services.AddScoped<IAuthEventLogger, AuthEventLogger>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<ILegalDocumentService, LegalDocumentService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IOAuthProvider, GoogleOAuthProvider>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IUserContext, UserContext>();

// Assinaturas / cobrança
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IAccountDeletionService, AccountDeletionService>();
builder.Services.AddScoped<IPaymentHistoryService, PaymentHistoryService>();
builder.Services.AddScoped<IEntitlementService, EntitlementService>();
builder.Services.AddScoped<IBillingWebhookService, BillingWebhookService>();
builder.Services.AddScoped<PlanSeeder>();
builder.Services.AddScoped<LegalDocumentSeeder>();
// Pipeline de exclusão LGPD (strip/purge), usado pelos jobs de background.
builder.Services.AddScoped<DataDeletionService>();
builder.Services.AddHostedService<SubscriptionExpiryBackgroundService>();
builder.Services.AddHostedService<RecurringExpenseRenewalService>();
builder.Services.AddHostedService<AuditLogCleanupService>();
builder.Services.AddHostedService<TenantDeletionBackgroundService>();
builder.Services.AddHostedService<DataPurgeBackgroundService>();

// Gateway de pagamentos (Stripe)
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection(StripeOptions.SectionName));
// IStripeClient é thread-safe e sem estado por request — singleton. A chave é fixada aqui em vez de
// StripeConfiguration.ApiKey (global estático) para não vazar entre testes/hosts.
builder.Services.AddSingleton<IStripeClient>(sp =>
{
    var apiKey = sp.GetRequiredService<IConfiguration>().GetSection(StripeOptions.SectionName)["ApiKey"]
        ?? throw new InvalidOperationException("Stripe:ApiKey não configurado.");
    return new StripeClient(apiKey);
});
builder.Services.AddScoped<IPaymentGateway, StripeGateway>();
builder.Services.AddScoped<IPaymentWebhookProcessor, StripeWebhookProcessor>();

// Storage (MinIO em dev, S3 em prod) — AmazonS3Client é thread-safe, registrado como singleton.
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.AddSingleton<IStorageService, MinioStorageService>();

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IEmployeeSalaryLinkRepository, EmployeeSalaryLinkRepository>();
builder.Services.AddScoped<ITenantRoleRepository, TenantRoleRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();
builder.Services.AddScoped<IServiceCategoryRepository, ServiceCategoryRepository>();
builder.Services.AddScoped<IAppointmentRepository, AppointmentRepository>();
builder.Services.AddScoped<IMediaRepository, MediaRepository>();
builder.Services.AddScoped<IPlanRepository, PlanRepository>();
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
builder.Services.AddScoped<IGatewayCustomerRepository, GatewayCustomerRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IUserTenantRepository, UserTenantRepository>();
builder.Services.AddScoped<IBillingWebhookRepository, BillingWebhookRepository>();
builder.Services.AddScoped<IDataRetentionRepository, DataRetentionRepository>();
builder.Services.AddScoped<IAccountDeletionRepository, AccountDeletionRepository>();
builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
builder.Services.AddScoped<ILegalDocumentRepository, LegalDocumentRepository>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IContactMessageRepository, ContactMessageRepository>();

builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
    options.SuppressModelStateInvalidFilter = true);
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await scope.ServiceProvider.GetRequiredService<PlanSeeder>().SeedAsync();
    await scope.ServiceProvider.GetRequiredService<LegalDocumentSeeder>().SeedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();
}

// Log de request (método, rota, status, latência). Nasce em Information → não polui o SystemLog
// (o sink só persiste >= Warning).
//
// O GetLevel é customizado por causa da ordem do pipeline: o ExceptionMiddleware é o mais externo,
// então as exceções de domínio sobem POR AQUI antes de serem tratadas. Sem isso, todo 404/400 de
// negócio viraria um Error no SystemLog — ruído que esconderia falha de verdade. AppException é
// resultado esperado (e o ExceptionMiddleware já registra como Warning); só o que não é AppException
// (ou um 5xx) conta como Error.
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, _, ex) => ex switch
    {
        null => httpContext.Response.StatusCode > 499 ? LogEventLevel.Error : LogEventLevel.Information,
        AppException => LogEventLevel.Information,
        _ => LogEventLevel.Error,
    };
});

// Liveness/readiness — anônimo por design (orquestrador precisa bater sem credencial).
app.MapHealthChecks("/health").AllowAnonymous();

app.UseCors("Frontend");
app.UseAuthentication();
// Barra tudo (exceto allowlist) enquanto o usuário tiver senha temporária — precisa do User já populado.
app.UseMiddleware<MustChangePasswordMiddleware>();
// Barra tudo (exceto exportação/reativação/auth) enquanto a conta estiver em carência de exclusão.
app.UseMiddleware<AccountDeletionBlockMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();
