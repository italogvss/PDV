using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using PDV.Api.Middleware;
using PDV.Application.Interfaces;
using PDV.Application.Validators.Users;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;
using PDV.Infrastructure.Repositories;
using PDV.Infrastructure.Services;
using PDV.Infrastructure.Services.Payments.AbacatePay;
using PDV.Infrastructure.Storage;
using PDV.Application.Interfaces.Payments;
using Microsoft.Extensions.Options;
using Scalar.AspNetCore;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
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
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IOAuthProvider, GoogleOAuthProvider>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IUserContext, UserContext>();

// Assinaturas / cobrança
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IEntitlementService, EntitlementService>();
builder.Services.AddScoped<IBillingWebhookService, BillingWebhookService>();
builder.Services.AddScoped<PlanSeeder>();
builder.Services.AddHostedService<SubscriptionExpiryBackgroundService>();
builder.Services.AddHostedService<RecurringExpenseRenewalService>();
builder.Services.AddHostedService<AuditLogCleanupService>();

// Gateway de pagamentos (AbacatePay)
builder.Services.Configure<AbacatePayOptions>(builder.Configuration.GetSection(AbacatePayOptions.SectionName));
builder.Services.AddScoped<IPaymentGateway, AbacatePayGateway>();
builder.Services.AddScoped<IPaymentWebhookProcessor, AbacatePayWebhookProcessor>();
builder.Services.AddHttpClient<IAbacatePayApiClient, AbacatePayApiClient>((sp, http) =>
{
    var options = sp.GetRequiredService<IOptions<AbacatePayOptions>>().Value;
    var baseUrl = options.BaseUrl.EndsWith('/') ? options.BaseUrl : options.BaseUrl + "/";
    http.BaseAddress = new Uri(baseUrl);
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
});

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
builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
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
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
