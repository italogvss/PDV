import { useState } from 'react'
import {
  Box,
  Button,
  Switch,
  TextField,
  Chip,
  IconButton,
} from '@mui/material'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

export default function AdvancedSection() {
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [auditLogs, setAuditLogs] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('https://api.cafedaesquina.com/zelo/hook')

  const publicKey = 'zlpk_live_4f23a8b1c9d77e018fa3b25d'
  const secretKey = 'zlsk_live_••••••••••••••••a4c1'
  const secretKeyReal = 'zlsk_live_a1b2c3d4e5f6g7h8a4c1'
  const storeId = 'zelo:org:84021a-cafedaesquina'
  const appVersion = 'v 4.18.2 — 12/05/2026'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Chaves de API" subtitle="Use para integrar sistemas próprios">
        <SettingRow label="Chave pública" sublabel="Pode ser exposta no navegador">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={publicKey}
              inputProps={{ readOnly: true }}
              sx={{ width: 320 }}
            />
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(publicKey)}
              title="Copiar"
            >
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        </SettingRow>

        <SettingRow label="Chave secreta" sublabel="Nunca compartilhe esta chave">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={secretRevealed ? secretKeyReal : secretKey}
              inputProps={{ readOnly: true }}
              sx={{ width: 280 }}
              type={secretRevealed ? 'text' : 'password'}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSecretRevealed((v) => !v)}
            >
              {secretRevealed ? 'Ocultar' : 'Revelar'}
            </Button>
            <Button variant="outlined" size="small" color="error">
              Revogar
            </Button>
          </Box>
        </SettingRow>

        <SettingRow label="Webhook URL" sublabel="Para receber eventos de venda em tempo real">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              sx={{ width: 320 }}
            />
            <Button variant="outlined" size="small">
              Testar
            </Button>
          </Box>
        </SettingRow>
      </SettingCard>

      <SettingCard title="Desenvolvedor">
        <SettingRow
          label="Modo desenvolvedor"
          sublabel="Habilita console, logs detalhados e endpoints de teste"
        >
          <Switch
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow
          label="Registrar logs de auditoria"
          sublabel="Cada ação relevante é registrada por 90 dias"
        >
          <Switch
            checked={auditLogs}
            onChange={(e) => setAuditLogs(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Identificador do estabelecimento">
          <TextField
            size="small"
            value={storeId}
            inputProps={{ readOnly: true }}
            sx={{ width: 320 }}
          />
        </SettingRow>

        <SettingRow label="Versão do aplicativo">
          <Chip
            label={appVersion}
            size="small"
            sx={{ bgcolor: 'surface.raised', color: 'text.secondary', fontWeight: 500 }}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Zona de risco" subtitle="Ações irreversíveis. Tenha cuidado." danger>
        <SettingRow
          label="Resetar configurações"
          sublabel="Volta tudo para o padrão. Dados de vendas não são afetados."
        >
          <Button
            variant="outlined"
            color="error"
            sx={{ minWidth: 200 }}
          >
            Resetar
          </Button>
        </SettingRow>

        <SettingRow
          label="Apagar todos os dados de teste"
          sublabel="Remove vendas, clientes e produtos marcados como teste"
        >
          <Button
            variant="outlined"
            color="error"
            sx={{ minWidth: 200 }}
          >
            Apagar
          </Button>
        </SettingRow>

        <SettingRow
          label="Encerrar estabelecimento"
          sublabel="Cancela a assinatura e remove o acesso permanentemente"
        >
          <Button
            variant="contained"
            color="error"
            startIcon={<BlockOutlinedIcon />}
            sx={{ minWidth: 200 }}
          >
            Encerrar conta
          </Button>
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
