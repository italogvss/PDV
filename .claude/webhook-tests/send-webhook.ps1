#Requires -Version 5.1
<#
.SYNOPSIS
    Envia um webhook AbacatePay assinado (HMAC-SHA256) para a API local.

.DESCRIPTION
    A chave HMAC do AbacatePay é PÚBLICA e fixa (a mesma para todos os merchants) — está
    hardcoded em AbacatePayWebhookProcessor.AbacatePayHmacKey. Por isso é possível forjar
    eventos válidos localmente sem depender do gateway.

    O corpo é lido como texto (BOM removido, igual ao StreamReader do backend) e enviado
    como bytes UTF-8 — os mesmos bytes usados no HMAC. Qualquer reserialização quebraria
    a assinatura.

.PARAMETER Payload
    Caminho do arquivo JSON (ver ./payloads).

.PARAMETER Vars
    Hashtable de substituição dos tokens {{NOME}} do payload.

.EXAMPLE
    $env:ABACATE_WEBHOOK_SECRET = 'o-secret-do-.env'
    .\send-webhook.ps1 .\payloads\checkout-completed-paid.json -Vars @{
        SUBSCRIPTION_ID = '0a50d090-2eca-4963-8e92-ca32194579d5'
        BILL_ID         = 'bill_qa0001'
        CUSTOMER_ID     = 'cust_qa0001'
        USER_ID         = '3f2b...'
        PLAN_ID         = '9c1e...'
        PRODUCT_ID      = 'prod_LzwznAgbxBqQkHJ4ZNhRq5uX'
    }

.EXAMPLE
    # Só imprime corpo/assinatura/EventId, sem enviar.
    .\send-webhook.ps1 .\payloads\unknown-event.json -Vars @{ LOG_ID = 'log_qa1'; CUSTOMER_ID = 'cust_qa0001' } -DryRun
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [string]$Payload,

    [hashtable]$Vars = @{},

    [string]$Uri = 'http://localhost:5000/api/webhooks/abacatepay',

    [string]$Secret = $env:ABACATE_WEBHOOK_SECRET,

    # Envia uma assinatura válida na forma, porém incorreta → espera 403.
    [switch]$BadSignature,

    # Omite o header X-Webhook-Signature → espera 403.
    [switch]$NoSignature,

    # Não envia o secret na query string → espera 401.
    [switch]$NoSecret,

    # Anexa espaços ao fim do corpo ANTES de assinar: muda o EventId (hash) dos checkout.*
    # mantendo a assinatura válida. Testa a fragilidade da idempotência por hash do corpo.
    [switch]$MutateBody,

    # Assina o corpo original e envia um corpo adulterado → espera 403 (o HMAC cobre o corpo).
    [switch]$TamperAfterSign,

    # Imprime corpo, EventId e assinatura sem enviar.
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Chave pública fixa do AbacatePay — idêntica à const em AbacatePayWebhookProcessor.cs.
$HmacKey = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

if (-not (Test-Path $Payload)) { throw "Payload não encontrado: $Payload" }

# ReadAllText remove o BOM, assim como o StreamReader do WebhooksController.
$json = [System.IO.File]::ReadAllText((Resolve-Path $Payload).Path)

foreach ($key in $Vars.Keys) {
    $json = $json.Replace("{{$key}}", [string]$Vars[$key])
}
if ($json -match '\{\{(\w+)\}\}') {
    Write-Warning "Token não substituído no payload: {{$($Matches[1])}}"
}

if ($MutateBody) { $json = $json + "   " }

$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($HmacKey)
$signature = [Convert]::ToBase64String($hmac.ComputeHash($bytes))
$hmac.Dispose()

# EventId: subscription.* usam o "id" (log_...) do payload; checkout.* usam HEX(SHA256(corpo)).
$sha = [System.Security.Cryptography.SHA256]::Create()
$bodyHash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '')
$sha.Dispose()

Write-Host "Bytes do corpo      : $($bytes.Length)"                -ForegroundColor DarkGray
Write-Host "EventId (checkout.*): $bodyHash"                       -ForegroundColor DarkGray
Write-Host "X-Webhook-Signature : $signature"                      -ForegroundColor DarkGray

if ($DryRun) {
    Write-Host "`n--- corpo enviado ---" -ForegroundColor DarkGray
    Write-Host $json
    return
}

if ($BadSignature) { $signature = 'ZGVmaW5pdGl2YW1lbnRlLW5hby1lLXZhbGlkYQ==' }

# Assinatura calculada acima sobre $bytes; aqui o corpo muda depois de assinado.
if ($TamperAfterSign) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json + ' ')
    Write-Host "Corpo adulterado apos assinar ($($bytes.Length) bytes)" -ForegroundColor Yellow
}

$headers = @{}
if (-not $NoSignature) { $headers['X-Webhook-Signature'] = $signature }

if ($NoSecret) {
    $url = $Uri
}
else {
    if ([string]::IsNullOrWhiteSpace($Secret)) {
        throw 'Secret vazio. Passe -Secret ou defina $env:ABACATE_WEBHOOK_SECRET (= AbacatePay__WebhookSecret do .env).'
    }
    $url = $Uri + '?webhookSecret=' + [uri]::EscapeDataString($Secret)
}

try {
    $response = Invoke-WebRequest -Uri $url -Method Post -Body $bytes `
        -ContentType 'application/json' -Headers $headers -UseBasicParsing
    Write-Host "==> HTTP $([int]$response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
}
catch {
    $status = $null
    if ($_.Exception.Response) { $status = $_.Exception.Response.StatusCode.value__ }

    if ($status) { Write-Host "==> HTTP $status" -ForegroundColor Yellow }
    else { Write-Host "==> Falha de rede: $($_.Exception.Message)" -ForegroundColor Red }
}
