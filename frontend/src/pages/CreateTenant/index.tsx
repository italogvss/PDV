import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Button, CircularProgress, Divider, Paper, Typography, useTheme } from '@mui/material'
import { useCallback, useState } from 'react'
import { useSelector } from 'react-redux'
import { useCreateTenant } from '../../hooks/useCreateTenant'
import type { RootState } from '../../store'
import FinishScreen from './components/FinishScreen'
import PreviewPanel from './components/PreviewPanel'
import StepDocumentos from './components/StepDocumentos'
import StepEndereco from './components/StepEndereco'
import StepNegocio from './components/StepNegocio'
import StepperBar from './components/StepperBar'
import type { CreateTenantFormData, FormErrors } from './types'
import { INITIAL_FORM_DATA, STEPS } from './types'

function validateStep(step: number, data: CreateTenantFormData): FormErrors {
  const errors: FormErrors = {}

  if (step === 1) {
    if (!data.fantasyName.trim()) errors.fantasyName = 'Nome obrigatório'
    if (!data.segment) errors.segment = 'Selecione um segmento'
  }

  if (step === 2 && !data.skipDocuments) {
    if (data.cnpj.replace(/\D/g, '').length !== 14) errors.cnpj = 'CNPJ inválido'
    if (!data.companyName.trim()) errors.companyName = 'Razão social obrigatória'
  }

  if (step === 3) {
    if (data.cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido'
    if (!data.street.trim()) errors.street = 'Logradouro obrigatório'
    if (!data.number.trim()) errors.number = 'Número obrigatório'
    if (!data.neighborhood.trim()) errors.neighborhood = 'Bairro obrigatório'
    if (!data.city.trim()) errors.city = 'Cidade obrigatória'
    if (!data.state.trim()) errors.state = 'UF obrigatória'
  }

  return errors
}

export default function OnboardingTenant() {
  const theme = useTheme()
  const authName = useSelector((s: RootState) => s.auth.name)
  const firstName = authName?.split(' ')[0] ?? 'você'

  const createTenant = useCreateTenant()

  const [step, setStep] = useState(1)
  const [finished, setFinished] = useState(false)
  const [formData, setFormData] = useState<CreateTenantFormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<FormErrors>({})

  const patch = useCallback((update: Partial<CreateTenantFormData>) => {
    setFormData((prev) => ({ ...prev, ...update }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(update).forEach((k) => delete next[k as keyof CreateTenantFormData])
      return next
    })
  }, [])

  async function handleNext() {
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    if (step === STEPS.length) {
      await createTenant.mutateAsync(formData)
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    setErrors({})
    setStep((s) => s - 1)
  }

  function handleReset() {
    setFormData(INITIAL_FORM_DATA)
    setErrors({})
    setStep(1)
    setFinished(false)
  }

  if (finished) {
    return (
      <FinishScreen
        formData={formData}
        firstName={firstName}
        onReset={handleReset}
      />
    )
  }

  const bgGradient = `linear-gradient(160deg, ${theme.palette.surface.default} 60%, ${theme.palette.accent[50]} 100%)`

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left column */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 4, md: 5 },
          overflowY: 'auto',
          minWidth: 0,
          background: bgGradient,
        }}
      >
        {/* Centered content */}
        <Box sx={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column' }}>
          {/* Greeting */}
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                bgcolor: 'success.soft',
                color: 'success.ink',
                px: 1.5,
                py: 0.5,
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 500,
                mb: 2,
              }}
            >
              Olá {firstName}, seja bem-vindo 👋
            </Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.75rem', md: '2.25rem' } }}
            >
              Vamos criar o seu estabelecimento
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Quatro passos rápidos para configurar o PDV Ultra.{' '}
              <Box component="span" sx={{ fontWeight: 500 }}>
                Leva uns 2 minutos
              </Box>{' '}
              — você pode ajustar tudo depois.
            </Typography>
          </Box>

          {/* Stepper */}
          <StepperBar steps={STEPS} currentStep={step} />

          {/* Paper card */}
          <Paper
            sx={{
              mt: 3,
              border: '1px solid',
              borderColor: 'border.subtle',
              borderRadius: 2,
              boxShadow: theme.customShadows.md,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            elevation={0}
          >
            {/* Step content */}
            <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
              {step === 1 && (
                <StepNegocio data={formData} onChange={patch} errors={errors} />
              )}
              {step === 2 && (
                <StepDocumentos data={formData} onChange={patch} errors={errors} />
              )}
              {step === 3 && (
                <StepEndereco data={formData} onChange={patch} errors={errors} />
              )}
              {/* {step === 4 && (
                <StepHorario data={formData} onChange={patch} />
              )} */}
            </Box>

            <Divider />

            {/* Navigation footer */}
            <Box
              sx={{
                px: { xs: 2.5, sm: 4 },
                py: 2,
                bgcolor: 'surface.sunken',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {step > 1 ? (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                >
                  Voltar
                </Button>
              ) : (
                <Box />
              )}

              <Typography
                variant="body2"
                color="text.tertiary"
                sx={{ mx: 'auto', fontVariantNumeric: 'tabular-nums' }}
              >
                {String(step).padStart(2, '0')} / 0{STEPS.length}
              </Typography>

              <Button
                variant="contained"
                color="success"
                endIcon={createTenant.isPending ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                onClick={handleNext}
                disabled={createTenant.isPending}
              >
                {step === STEPS.length ? 'Finalizar' : 'Continuar'}
              </Button>
            </Box>
          </Paper>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {step > 1
              ? 'Precisa de ajuda? Entre em contato com o suporte.'
              : 'Os dados ficam salvos a cada passo'}
          </Typography>
        </Box>
      </Box>

      {/* Right column: preview */}
      <Box
        sx={{
          width: 320,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          bgcolor: 'surface.sunken',
          borderLeft: 1,
          borderColor: 'border.subtle',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          p: 3,
          flexShrink: 0,
        }}
      >
        <PreviewPanel data={formData} step={step} />
      </Box>
    </Box>
  )
}
