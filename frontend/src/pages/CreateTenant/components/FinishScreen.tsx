import { Box, Typography, Button, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckIcon from '@mui/icons-material/Check'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import GroupIcon from '@mui/icons-material/Group'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SettingsIcon from '@mui/icons-material/Settings'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useNavigate } from 'react-router-dom'
import type { CreateTenantFormData } from '../types'

interface FinishScreenProps {
  formData: CreateTenantFormData
  firstName: string
  onReset: () => void
}

const NEXT_STEPS = [
  {
    icon: <Inventory2Icon />,
    label: 'Cadastrar produtos',
    description: 'Importar de planilha ou criar manualmente',
    href: '/estoque',
  },
  {
    icon: <CreditCardIcon />,
    label: 'Conectar pagamentos',
    description: 'Pix, maquininhas e métodos aceitos',
    href: '/configuracoes',
  },
  {
    icon: <GroupIcon />,
    label: 'Convidar equipe',
    description: 'Adicione caixas, atendentes e gerentes',
    href: '/funcionarios',
  },
]

export default function FinishScreen({ formData, firstName, onReset }: FinishScreenProps) {
  const navigate = useNavigate()
  const businessName = formData.fantasyName || 'Seu negócio'
  const hasCnpj = !formData.skipDocuments && !!formData.cnpj

  const checklist = [
    { label: 'Estabelecimento criado', show: true },
    { label: 'Endereço cadastrado',    show: !!formData.street },
    { label: 'Horário definido',       show: true },
    { label: 'CNPJ vinculado',         show: hasCnpj },
  ].filter((i) => i.show)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 4 },
        py: 6,
        background: 'linear-gradient(160deg, #fdfdfb 60%, #ecf7ee 100%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        {/* Check circle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40, color: '#fff' }} />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}
        >
          Tudo pronto, {firstName}!
        </Typography>
        <Typography
          variant="body1"
          sx={{ textAlign: 'center', mb: 4 }}
          color="text.secondary"
        >
          <Typography component="strong" color="text.primary" sx={{ fontWeight: 600 }}>
            {businessName}
          </Typography>{' '}
          está configurado e pronto para receber a primeira venda.
        </Typography>

        {/* Checklist */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 2, mb: 4, overflow: 'hidden', borderColor: 'border.subtle' }}
        >
          <List disablePadding>
            {checklist.map(({ label }, i) => (
              <ListItem
                key={label}
                sx={{
                  borderBottom: i < checklist.length - 1 ? 1 : 0,
                  borderColor: 'border.subtle',
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  sx={{fontWeight: 500}}
                  slotProps={{ primary: { variant: 'body2' } }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Next steps */}
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontSize: '0.65rem', display: 'block', mb: 1.5, letterSpacing: 1.5 }}
        >
          Próximos passos sugeridos
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4 }}>
          {NEXT_STEPS.map(({ icon, label, description, href }) => (
            <Paper
              key={label}
              variant="outlined"
              onClick={() => navigate(href)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                borderColor: 'border.subtle',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'surface.raised' },
              }}
            >
              <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              </Box>
              <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            </Paper>
          ))}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={onReset}
          >
            Refazer
          </Button>
          <Button
            variant="contained"
            color="success"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/')}
          >
            Entrar no PDV Ultra
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
