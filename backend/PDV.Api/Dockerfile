# =============================================================
# Backend PDV-Ultra - imagem multi-estagio
#   dev    -> desenvolvimento: SDK + dotnet watch + vsdbg
#   final  -> producao: runtime enxuto
# =============================================================

# -- Estagio de desenvolvimento (docker-compose.yml) ----------
# O codigo entra por bind mount e o comando (dotnet watch) e
# definido no compose. vsdbg permite o VS Code anexar o debugger.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dev
WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip procps \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sSL https://aka.ms/getvsdbgsh | bash /dev/stdin -v latest -l /vsdbg
EXPOSE 8080

# -- Estagios de producao -------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copia os .csproj primeiro para aproveitar o cache de layers no restore
COPY ["PDV.Api/PDV.Api.csproj", "PDV.Api/"]
COPY ["PDV.Application/PDV.Application.csproj", "PDV.Application/"]
COPY ["PDV.Domain/PDV.Domain.csproj", "PDV.Domain/"]
COPY ["PDV.Infrastructure/PDV.Infrastructure.csproj", "PDV.Infrastructure/"]
RUN dotnet restore "PDV.Api/PDV.Api.csproj"

COPY . .
WORKDIR "/src/PDV.Api"
RUN dotnet build "PDV.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "PDV.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PDV.Api.dll"]
