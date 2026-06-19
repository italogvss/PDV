import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../../../components/PageHeader'
import { useAdminConfig, useSimulatePix } from '../../../hooks/useAdmin'

function MaskedField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export default function AdminConfigPage() {
  const { data: config, isLoading } = useAdminConfig()
  const simulate = useSimulatePix()
  const [pixChargeId, setPixChargeId] = useState('')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
      <PageHeader
        title="Config AbacatePay"
        description="Valores lidos do appsettings.json. Para editar, altere o arquivo diretamente."
      />

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Configuração Atual
          </Typography>

          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <MaskedField label="API Key" value={config?.apiKey ?? ''} />
              <MaskedField label="Webhook Secret" value={config?.webhookSecret ?? ''} />
              <MaskedField label="Base URL" value={config?.baseUrl ?? ''} />
              <MaskedField label="Back URL (legado)" value={config?.backUrl ?? '—'} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Simular Pagamento PIX
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Insira o Charge ID (pix_char_...) de um pagamento pendente para simular a confirmação.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              placeholder="pix_char_..."
              value={pixChargeId}
              onChange={(e) => setPixChargeId(e.target.value)}
              sx={{ flex: 1, maxWidth: 420 }}
              slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!pixChargeId.trim() || simulate.isPending}
              onClick={() => simulate.mutate(pixChargeId.trim())}
            >
              {simulate.isPending ? <CircularProgress size={16} color="inherit" /> : 'Simular'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
