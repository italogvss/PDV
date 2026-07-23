import CreditCardOffIcon from '@mui/icons-material/CreditCardOff'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend'
import { Box, Checkbox, FormControlLabel, FormHelperText, Link, Typography } from '@mui/material'
import type { CreateTenantFormData, FormErrors } from '../types'

interface StepTrialProps {
  data: CreateTenantFormData
  onChange: (patch: Partial<CreateTenantFormData>) => void
  errors: FormErrors
}

const HIGHLIGHTS = [
  {
    icon: <EventAvailableIcon />,
    label: '30 dias grátis',
    description: 'Acesso completo ao Kashing, sem restrição de recursos.',
  },
  {
    icon: <CreditCardOffIcon />,
    label: 'Sem cartão de crédito',
    description: 'Você só paga se decidir continuar depois do teste.',
  },
  {
    icon: <CancelScheduleSendIcon />,
    label: 'Cancele quando quiser',
    description: 'Sem cobrança e sem burocracia — sua loja continua com você.',
  },
]

export default function StepTrial({ data, onChange, errors }: StepTrialProps) {
  return (
    <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          mb: 1.5,
          fontSize: { xs: '1.6rem', md: '2rem' },
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.accent[600]}, ${theme.palette.accent[400]})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Seu teste grátis de 30 dias começa agora
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mb: 4 }}>
        Explore todas as funcionalidades do Kashing sem compromisso. Ao final do período, você
        escolhe se quer continuar — sem surpresas.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: '100%',
          mb: 4,
        }}
      >
        {HIGHLIGHTS.map(({ icon, label, description }) => (
          <Box
            key={label}
            sx={{
              flex: 1,
              border: 1,
              borderColor: 'border.subtle',
              borderRadius: 2,
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'surface.paper',
            }}
          >
            <Box sx={{ color: 'success.main', display: 'flex' }}>{icon}</Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ width: '100%', textAlign: 'left' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={data.acceptedTerms}
              onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Li e concordo com os{' '}
              <Link
                href={`${import.meta.env.VITE_LANDING_URL}/termos-de-uso`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link
                href={`${import.meta.env.VITE_LANDING_URL}/politica-de-privacidade`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Política de Privacidade
              </Link>{' '}
              do Kashing.
            </Typography>
          }
        />
        {errors.acceptedTerms && (
          <FormHelperText error sx={{ ml: 1.75 }}>
            {errors.acceptedTerms}
          </FormHelperText>
        )}
      </Box>
    </Box>
  )
}
