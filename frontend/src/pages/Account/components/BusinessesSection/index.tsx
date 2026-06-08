import {
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Paper,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'

interface Business {
  id: string
  initials: string
  name: string
  role: string
  address: string
  color: string
  active?: boolean
}

const BUSINESSES: Business[] = [
  {
    id: '1',
    initials: 'CE',
    name: 'Café da Esquina',
    role: 'Proprietário',
    address: 'Rua Augusta, 1480 — São Paulo/SP',
    color: '#2fa040',
    active: true,
  },
  {
    id: '2',
    initials: 'BP',
    name: 'Padaria Bom Pão',
    role: 'Gerente',
    address: 'Av. Paulista, 2200 — São Paulo/SP',
    color: '#d97a1f',
  },
]

export default function BusinessesSection() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Meus negócios
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Você pode gerenciar mais de um estabelecimento
          </Typography>
        </Box>
        <Button variant="contained" color="secondary" size="small" startIcon={<AddIcon />}>
          Novo negócio
        </Button>
      </Box>
      <Divider />

      {BUSINESSES.map((biz, idx) => (
        <Box key={biz.id}>
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
              <Avatar
                variant="rounded"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: biz.color,
                  color: 'common.white',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                {biz.initials}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                    {biz.name}
                  </Typography>
                  {biz.active && (
                    <Chip
                      label="Ativo"
                      size="small"
                      sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {biz.role} • {biz.address}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {!biz.active && (
                <Button variant="outlined" size="small">
                  Acessar
                </Button>
              )}
              <IconButton size="small">
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {idx < BUSINESSES.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
