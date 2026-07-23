import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Button, CircularProgress, Divider, Paper, Typography, useTheme } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useCreateTenant } from '../../hooks/useCreateTenant'
import { useSubscription } from '../../hooks/useSubscription'
import { useThemeMode } from '../../context/ThemeModeContext'
import type { RootState } from '../../store'
import FinishScreen from './components/FinishScreen'
import StepEndereco from './components/StepEndereco'
import StepNegocio from './components/StepNegocio'
import StepTrial from './components/StepTrial'
import StepperBar from './components/StepperBar'
import type { CreateTenantFormData, FormErrors } from './types'
import { INITIAL_FORM_DATA, STEPS } from './types'

function validateStep(step: number, data: CreateTenantFormData): FormErrors {
  const errors: FormErrors = {}

  if (step === 1) {
    if (!data.fantasyName.trim()) errors.fantasyName = 'Nome obrigatório'
    if (!data.segment) errors.segment = 'Selecione um segmento'
    if (data.segment === 'outro' && !data.customSegmentName.trim()) {
      errors.customSegmentName = 'Informe o nome do segmento'
    }
  }

  if (step === 2 && !data.skipAddress) {
    if (data.cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido'
    if (!data.street.trim()) errors.street = 'Logradouro obrigatório'
    if (!data.number.trim()) errors.number = 'Número obrigatório'
    if (!data.neighborhood.trim()) errors.neighborhood = 'Bairro obrigatório'
    if (!data.city.trim()) errors.city = 'Cidade obrigatória'
    if (!data.state.trim()) errors.state = 'UF obrigatória'
  }

  if (step === 3 && !data.acceptedTerms) {
    errors.acceptedTerms = 'Você precisa aceitar os termos para continuar'
  }

  return errors
}

export default function OnboardingTenant() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { mode } = useThemeMode()
  const logoSrc = mode === 'dark' ? '/logo-white.png' : '/logo-black.png'
  const authName = useSelector((s: RootState) => s.auth.name)
  const firstName = authName?.split(' ')[0] ?? 'você'
  // Já é dono de outra loja: o teste grátis é por usuário (não por loja) — ele já sabe como
  // funciona, então o step de "Teste grátis" só faz sentido na primeira loja.
  const hasExistingStore = useSelector((s: RootState) => s.auth.tenants.length > 0)

  const createTenant = useCreateTenant()
  const { data: subscription, isLoading: loadingSubscription } = useSubscription()

  const [step, setStep] = useState(1)
  const [finished, setFinished] = useState(false)
  const [formData, setFormData] = useState<CreateTenantFormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<FormErrors>({})

  const activeSteps = useMemo(
    () => (hasExistingStore ? STEPS.filter((s) => s.label !== 'Teste grátis') : STEPS),
    [hasExistingStore],
  )

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
    if (step === activeSteps.length) {
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

  // Rede de segurança: quem já usou o trial precisa pagar antes de criar o negócio. Se um slug
  // órfão tiver rota até aqui pulando o ChoosePlan, devolve pro checkout obrigatório em /planos.
  const hasActiveSub = subscription?.status === 'Active' || subscription?.status === 'Trialing'
  if (loadingSubscription) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (subscription?.hasUsedTrial && !hasActiveSub) {
    return <Navigate to="/planos" replace />
  }

  const bgGradient = `linear-gradient(160deg, ${theme.palette.surface.default} 60%, ${theme.palette.accent[50]} 100%)`

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 4, md: 5 },
        overflowY: 'auto',
        background: bgGradient,
      }}
    >
      {/* Centered content */}
      <Box sx={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 3, md: 4 } }}>
          <Box component="img" src={logoSrc} alt="Kashing" sx={{ height: 40 }} />
        </Box>

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
            Alguns passos rápidos para configurar o Kashing.{' '}
            <Box component="span" sx={{ fontWeight: 500 }}>
              Leva uns 2 minutos
            </Box>{' '}
            — você pode ajustar tudo depois.
          </Typography>
        </Box>

        {/* Stepper */}
        <StepperBar steps={activeSteps} currentStep={step} />

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
              <StepEndereco data={formData} onChange={patch} errors={errors} />
            )}
            {step === 3 && !hasExistingStore && (
              <StepTrial data={formData} onChange={patch} errors={errors} />
            )}
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              {hasExistingStore && (
                <Button variant="text" color="inherit" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
              )}
              {step > 1 && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                >
                  Voltar
                </Button>
              )}
            </Box>

            <Typography
              variant="body2"
              color="text.tertiary"
              sx={{ mx: 'auto', fontVariantNumeric: 'tabular-nums' }}
            >
              {String(step).padStart(2, '0')} / 0{activeSteps.length}
            </Typography>

            <Button
              variant="contained"
              endIcon={createTenant.isPending ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
              onClick={handleNext}
              disabled={createTenant.isPending}
            >
              {step === activeSteps.length ? 'Finalizar' : 'Continuar'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
