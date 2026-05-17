import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  Divider,
} from '@mui/material'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'

interface Invoice {
  id: string
  number: string
  description: string
  date: string
  amount: string
  status: 'paid' | 'pending' | 'failed'
}

const INVOICES: Invoice[] = [
  { id: '1', number: 'INV-0421', description: 'Plano Premium — Maio/2026', date: '05/05/2026', amount: 'R$ 89,90', status: 'paid' },
  { id: '2', number: 'INV-0398', description: 'Plano Premium — Abril/2026', date: '05/04/2026', amount: 'R$ 89,90', status: 'paid' },
  { id: '3', number: 'INV-0375', description: 'Plano Premium — Março/2026', date: '05/03/2026', amount: 'R$ 89,90', status: 'paid' },
  { id: '4', number: 'INV-0349', description: 'Plano Premium — Fevereiro/2026', date: '05/02/2026', amount: 'R$ 89,90', status: 'paid' },
  { id: '5', number: 'INV-0322', description: 'Plano Premium — Janeiro/2026', date: '05/01/2026', amount: 'R$ 89,90', status: 'paid' },
  { id: '6', number: 'INV-0301', description: 'Plano Premium — Dezembro/2025', date: '05/12/2025', amount: 'R$ 89,90', status: 'paid' },
  { id: '7', number: 'INV-0278', description: 'Upgrade Premium (pró-rata)', date: '20/11/2025', amount: 'R$ 42,30', status: 'paid' },
]

const STATUS_LABEL: Record<Invoice['status'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
}

export default function InvoicesSection() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Histórico de faturas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Baixe recibos e notas fiscais
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<FileDownloadOutlinedIcon />}>
          Baixar todas
        </Button>
      </Box>

      {/* Table header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 140px 160px 44px',
          px: 4,
          py: 1.5,
          bgcolor: 'surface.sunken',
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'border.subtle',
        }}
      >
        {['FATURA', 'DESCRIÇÃO', 'DATA', 'VALOR  STATUS', ''].map((col) => (
          <Typography
            key={col}
            variant="overline"
            sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em' }}
          >
            {col}
          </Typography>
        ))}
      </Box>

      {INVOICES.map((invoice, idx) => (
        <Box key={invoice.id}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 140px 160px 44px',
              alignItems: 'center',
              px: 4,
              py: 2.5,
            }}
          >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {invoice.number}
            </Typography>
            <Typography variant="body2" color="text.primary">
              {invoice.description}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invoice.date}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {invoice.amount}
              </Typography>
              <Chip
                label={STATUS_LABEL[invoice.status]}
                size="small"
                sx={
                  invoice.status === 'paid'
                    ? { bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }
                    : invoice.status === 'failed'
                    ? { bgcolor: 'error.soft', color: 'error.ink', fontWeight: 600 }
                    : { bgcolor: 'warning.soft', color: 'warning.ink', fontWeight: 600 }
                }
              />
            </Box>
            <IconButton size="small">
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
          {idx < INVOICES.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
