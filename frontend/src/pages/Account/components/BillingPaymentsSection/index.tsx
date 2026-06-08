import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  Paper,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CheckIcon from '@mui/icons-material/Check'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

interface PaymentMethod {
  id: string
  type: 'visa' | 'mc' | 'pix'
  label: string
  detail: string
  subtitle: string
  isPrimary?: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', type: 'visa', label: '•••• •••• •••• 4218', detail: 'Marcos Almeida • Expira 09/27', subtitle: '', isPrimary: true },
  { id: '2', type: 'mc', label: '•••• •••• •••• 7732', detail: 'Café da Esquina LTDA • Expira 03/29', subtitle: '' },
  { id: '3', type: 'pix', label: 'marcos.almeida@cafedaesquina.com.br', detail: 'Chave Pix • E-mail', subtitle: '' },
]

function CardBadge({ type }: { type: 'visa' | 'mc' | 'pix' }) {
  if (type === 'visa') {
    return (
      <Box sx={{
        px: 1.5, py: 0.75, borderRadius: 1, bgcolor: '#1a1f71',
        display: 'flex', alignItems: 'center', minWidth: 52,
      }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
          VISA
        </Typography>
      </Box>
    )
  }
  if (type === 'mc') {
    return (
      <Box sx={{
        px: 1.5, py: 0.75, borderRadius: 1, bgcolor: '#eb5c29',
        display: 'flex', alignItems: 'center', minWidth: 52, justifyContent: 'center',
      }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>MC</Typography>
      </Box>
    )
  }
  return (
    <Box sx={{
      px: 1.5, py: 0.75, borderRadius: 1, bgcolor: '#32bcad',
      display: 'flex', alignItems: 'center', minWidth: 52, justifyContent: 'center',
    }}>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>PIX</Typography>
    </Box>
  )
}

export default function BillingPaymentsSection() {
  const [companyName, setCompanyName] = useState('Café da Esquina LTDA ME')
  const [cnpj, setCnpj] = useState('32.456.789/0001-12')
  const [address, setAddress] = useState('Rua Augusta, 1480 — São Paulo/SP')
  const [cep, setCep] = useState('01304-001')
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setHasChanges(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
              Métodos de pagamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Como cobramos sua assinatura
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<AddIcon />}>
            Adicionar
          </Button>
        </Box>
        <Divider />
        {PAYMENT_METHODS.map((method, idx) => (
          <Box key={method.id}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 4,
                py: 2.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CardBadge type={method.type} />
                <Box>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                    {method.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {method.detail}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {method.isPrimary ? (
                  <Chip
                    label="Principal"
                    size="small"
                    sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                  />
                ) : (
                  <Button variant="text" size="small" sx={{ color: 'text.secondary' }}>
                    Tornar principal
                  </Button>
                )}
                <IconButton size="small">
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            {idx < PAYMENT_METHODS.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>

      <SettingCard
        title="Dados de cobrança"
        subtitle="Aparece nas notas fiscais da assinatura"
        action={
          hasChanges ? (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<CheckIcon />}
              onClick={() => setHasChanges(false)}
            >
              Salvar
            </Button>
          ) : undefined
        }
      >
        <SettingRow label="Razão social">
          <TextField size="small" value={companyName} onChange={handleChange(setCompanyName)} sx={{ width: 340 }} />
        </SettingRow>
        <SettingRow label="CNPJ">
          <TextField size="small" value={cnpj} onChange={handleChange(setCnpj)} sx={{ width: 340 }} />
        </SettingRow>
        <SettingRow label="Endereço de cobrança">
          <TextField size="small" value={address} onChange={handleChange(setAddress)} sx={{ width: 340 }} />
        </SettingRow>
        <SettingRow label="CEP">
          <TextField size="small" value={cep} onChange={handleChange(setCep)} sx={{ width: 160 }} />
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
