#Requires -Version 5.1
<#
.SYNOPSIS
    Cria os 4 produtos + preços recorrentes (BRL) da Kashing no Stripe e imprime as linhas
    `Stripe__Prices__<slug>=price_...` prontas para colar no .env.

.DESCRIPTION
    Idempotente por `lookup_key` do preço (o slug do plano): rodar de novo não duplica — reusa o
    preço existente com o mesmo lookup_key. Os valores (nome, preço, ciclo) espelham PlanSeedData.cs.

    Precisa apenas de uma chave secreta de teste (sk_test_...). Usa a API HTTP direto (curl), então
    não depende do Stripe CLI.

.PARAMETER SecretKey
    Chave secreta do Stripe (sk_test_... em teste). Default: $env:STRIPE_SECRET_KEY.

.EXAMPLE
    $env:STRIPE_SECRET_KEY = 'sk_test_...'
    .\bootstrap.ps1
#>
[CmdletBinding()]
param(
    [string]$SecretKey = $env:STRIPE_SECRET_KEY
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SecretKey)) {
    Write-Error "Informe a chave secreta: -SecretKey sk_test_... (ou defina `$env:STRIPE_SECRET_KEY)."
    exit 1
}

# Espelha PlanSeedData.cs: nome, preço em centavos, ciclo e slug (= lookup_key do preço).
$plans = @(
    @{ Slug = 'essencial-mensal';    Name = 'Kashing Essencial Mensal';    Amount = 2999;  Interval = 'month' }
    @{ Slug = 'essencial-anual';     Name = 'Kashing Essencial Anual';     Amount = 29999; Interval = 'year'  }
    @{ Slug = 'profissional-mensal'; Name = 'Kashing Profissional Mensal';  Amount = 4999;  Interval = 'month' }
    @{ Slug = 'profissional-anual';  Name = 'Kashing Profissional Anual';   Amount = 49999; Interval = 'year'  }
)

function Invoke-Stripe {
    param([string]$Method, [string]$Path, [string[]]$Data)
    $args = @('-s', '-X', $Method, "https://api.stripe.com/v1/$Path", '-u', "${SecretKey}:")
    foreach ($d in $Data) { $args += @('-d', $d) }
    $raw = & curl.exe @args
    $obj = $raw | ConvertFrom-Json
    if ($obj.error) { throw "Stripe: $($obj.error.message)" }
    return $obj
}

Write-Host "Criando produtos e preços no Stripe...`n" -ForegroundColor Cyan
$lines = @()

foreach ($plan in $plans) {
    # Reusa o preço já existente com este lookup_key (idempotência).
    $existing = Invoke-Stripe GET "prices/search" @("query=lookup_key:'$($plan.Slug)'")
    if ($existing.data.Count -gt 0) {
        $priceId = $existing.data[0].id
        Write-Host "= $($plan.Slug): preço já existe ($priceId)" -ForegroundColor DarkGray
    }
    else {
        $product = Invoke-Stripe POST 'products' @("name=$($plan.Name)")
        $price = Invoke-Stripe POST 'prices' @(
            "product=$($product.id)",
            "unit_amount=$($plan.Amount)",
            'currency=brl',
            "recurring[interval]=$($plan.Interval)",
            "lookup_key=$($plan.Slug)",
            'transfer_lookup_key=true'
        )
        $priceId = $price.id
        Write-Host "+ $($plan.Slug): criado ($priceId)" -ForegroundColor Green
    }
    $lines += "Stripe__Prices__$($plan.Slug)=$priceId"
}

Write-Host "`nCole no .env (a API lê Stripe:Prices:<slug>):`n" -ForegroundColor Cyan
$lines | ForEach-Object { Write-Host $_ }
