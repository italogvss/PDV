#Requires -Version 5.1
<#
.SYNOPSIS
    Assina um evento Stripe (esquema Stripe-Signature: t=...,v1=HMAC-SHA256) e o envia para a API
    local. Permite exercitar o pipeline de webhook sem depender do Stripe de verdade.

.DESCRIPTION
    A verificação do backend (EventUtility.ConstructEvent) usa o webhook secret (whsec_...) como
    chave HMAC sobre "<timestamp>.<corpo raw>". Como o secret está no .env local, dá para forjar
    eventos válidos aqui. O corpo é enviado como os MESMOS bytes UTF-8 usados no HMAC — qualquer
    reserialização quebraria a assinatura, exatamente como em produção.

    Tokens {{NOME}} no fixture são substituídos. Alguns são injetados automaticamente:
      EVENT_ID     evt_<guid>   (único a cada envio — evita a dedução de idempotência devolver 200)
      CREATED      agora (unix) — a âncora de período dos handlers
      NOW          agora (unix)
      NOW_PLUS_1M  agora + 30 dias   (fim de período mensal)
      NOW_PLUS_1Y  agora + 365 dias  (fim de período anual)

.PARAMETER Fixture
    Caminho do arquivo JSON do evento (ver ./fixtures).

.PARAMETER Vars
    Hashtable de substituição extra dos tokens {{NOME}} (ex.: ids da assinatura/cliente reais do seu banco).

.PARAMETER Secret
    Webhook secret. Default: $env:STRIPE_WEBHOOK_SECRET (ou o do .env se rodar da raiz).

.PARAMETER Url
    Endpoint do webhook. Default: http://localhost:5000/api/webhooks/stripe

.PARAMETER DryRun
    Só imprime corpo/assinatura, sem enviar.

.EXAMPLE
    $env:STRIPE_WEBHOOK_SECRET = 'whsec_...'
    .\send-stripe-webhook.ps1 .\fixtures\subscription-created.json -Vars @{
        SUB_ID    = 'sub_123'
        CUS_ID    = 'cus_123'
        SUB_LOCAL = '0a50d090-2eca-4963-8e92-ca32194579d5'   # Subscription.Id no nosso banco
        USER_ID   = '3f2b...'
        PLAN_ID   = '9c1e...'
        PRICE_ID  = 'price_...'
    }
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)][string]$Fixture,
    [hashtable]$Vars = @{},
    [string]$Secret = $env:STRIPE_WEBHOOK_SECRET,
    [string]$Url = 'http://localhost:5000/api/webhooks/stripe',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($Secret)) {
    Write-Error "Informe o webhook secret: -Secret whsec_... (ou defina `$env:STRIPE_WEBHOOK_SECRET)."
    exit 1
}
if (-not (Test-Path $Fixture)) { Write-Error "Fixture não encontrado: $Fixture"; exit 1 }

# Lê como texto e remove BOM — o backend lê via StreamReader, que também o descarta.
$body = [System.IO.File]::ReadAllText((Resolve-Path $Fixture), [System.Text.Encoding]::UTF8)
$body = $body -replace "^\xEF\xBB\xBF", ''

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$auto = @{
    EVENT_ID    = "evt_$([guid]::NewGuid().ToString('N'))"
    CREATED     = $now
    NOW         = $now
    NOW_PLUS_1M = [DateTimeOffset]::UtcNow.AddDays(30).ToUnixTimeSeconds()
    NOW_PLUS_1Y = [DateTimeOffset]::UtcNow.AddDays(365).ToUnixTimeSeconds()
}
foreach ($k in $auto.Keys) { if (-not $Vars.ContainsKey($k)) { $Vars[$k] = $auto[$k] } }

foreach ($k in $Vars.Keys) { $body = $body -replace "\{\{$k\}\}", [string]$Vars[$k] }

if ($body -match '\{\{(\w+)\}\}') {
    Write-Warning "Token não substituído: {{$($Matches[1])}} — passe-o em -Vars."
}

# Assinatura: HMAC-SHA256 hex de "<t>.<corpo>", chave = o secret verbatim (UTF-8).
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$signedPayload = "$timestamp.$body"
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signedPayload))
$sig = -join ($hash | ForEach-Object { $_.ToString('x2') })
$header = "t=$timestamp,v1=$sig"

Write-Host "→ $([System.IO.Path]::GetFileName($Fixture))  (event $($Vars.EVENT_ID))" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Stripe-Signature: $header`n" -ForegroundColor DarkGray
    Write-Host $body
    return
}

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
try {
    $resp = Invoke-WebRequest -Uri $Url -Method Post -Body $bytes `
        -ContentType 'application/json' -Headers @{ 'Stripe-Signature' = $header } -UseBasicParsing
    Write-Host "✓ $($resp.StatusCode) $($resp.StatusDescription)" -ForegroundColor Green
}
catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ HTTP $code" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor DarkGray }
}
