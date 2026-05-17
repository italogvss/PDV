import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Divider,
} from '@mui/material'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

interface UsageMetric {
  label: string
  value: string
  limit: string
  used: number
  detail: string
  noProgress?: boolean
}

const USAGE_METRICS: UsageMetric[] = [
  { label: 'VENDAS REGISTRADAS', value: '1.842', limit: 'ilimitado', used: 0, detail: 'Plano Premium não tem limite', noProgress: true },
  { label: 'PRODUTOS CADASTRADOS', value: '128', limit: '500', used: 25.6, detail: '25% utilizado' },
  { label: 'FUNCIONÁRIOS', value: '5', limit: '15', used: 33, detail: '33% utilizado' },
  { label: 'ARMAZENAMENTO', value: '1,2 GB', limit: '10 GB', used: 12, detail: 'Notas fiscais e fotos' },
  { label: 'NOTAS FISCAIS EMITIDAS', value: '347', limit: 'ilimitado', used: 0, detail: 'Integração SEFAZ ativa', noProgress: true },
  { label: 'SUPORTE PRIORITÁRIO', value: 'Atendimento 24/7', limit: '', used: 0, detail: 'Resposta em até 2 horas', noProgress: true },
]

const PLAN_FEATURES = [
  'Vendas ilimitadas',
  'PDV com leitor de código de barras',
  'Emissão de NFC-e e NFS-e',
  'Relatórios avançados e gráficos',
  'Integração com maquininhas',
  'Pix integrado sem taxa adicional',
  'Múltiplos caixas simultâneos',
  'Controle de estoque por lote',
  'Aplicativo mobile (iOS e Android)',
  'Backup automático em nuvem',
  'API para desenvolvedores',
  'Suporte prioritário 24/7',
]

interface PlanCard {
  name: string
  price: string | null
  period: string
  description: string
  features: string[]
  current?: boolean
  cta: string
  ctaVariant: 'contained' | 'outlined'
  enterprise?: boolean
}

const OTHER_PLANS: PlanCard[] = [
  {
    name: 'Grátis',
    price: '0,00',
    period: '/mês',
    description: 'Ideal para começar',
    features: ['Até 50 vendas/mês', '20 produtos', '1 usuário'],
    cta: 'Trocar plano',
    ctaVariant: 'contained',
  },
  {
    name: 'Essencial',
    price: '39,90',
    period: '/mês',
    description: 'Para pequenos negócios',
    features: ['Vendas ilimitadas', '200 produtos', 'Até 3 usuários'],
    cta: 'Trocar plano',
    ctaVariant: 'contained',
  },
  {
    name: 'Premium',
    price: '89,90',
    period: '/mês',
    description: 'Recursos completos',
    features: ['Tudo do Essencial', 'NFe ilimitada', 'API e integrações'],
    current: true,
    cta: 'Plano atual',
    ctaVariant: 'outlined',
  },
  {
    name: 'Enterprise',
    price: null,
    period: '',
    description: 'Multilojas',
    features: ['Multi-filial', 'SLA dedicado', 'Onboarding 1:1'],
    enterprise: true,
    cta: 'Falar com vendas',
    ctaVariant: 'contained',
  },
]

export default function SubscriptionSection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Plan banner */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: 1,
          borderColor: 'premium.200',
          bgcolor: 'premium.50',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: 'premium.400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WorkspacePremiumIcon sx={{ fontSize: 28, color: 'premium.900' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Plano Premium
            </Typography>
            <Chip
              label="ATIVO"
              size="small"
              sx={{
                bgcolor: 'premium.100',
                color: 'premium.900',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.04em',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Renovação automática em 5 de junho de 2026 • R$ 89,90/mês
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button variant="outlined" size="small" startIcon={<CreditCardOutlinedIcon />}>
            Gerenciar pagamento
          </Button>
          <Button variant="outlined" size="small" startIcon={<CancelOutlinedIcon />} color="inherit">
            Cancelar plano
          </Button>
        </Box>
      </Box>

      {/* Usage */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Uso este mês
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Período de 01/05 a 31/05
          </Typography>
        </Box>
        <Divider />
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          {USAGE_METRICS.map((metric) => (
            <Box
              key={metric.label}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'border.subtle',
                bgcolor: 'background.paper',
              }}
            >
              <Typography
                variant="overline"
                sx={{ fontSize: 10, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.07em', display: 'block', mb: 0.5 }}
              >
                {metric.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1.5 }}>
                <Typography variant="h5" fontWeight={700} color="text.primary">
                  {metric.value}
                </Typography>
                {metric.limit && (
                  <Typography variant="body2" color="text.tertiary">
                    / {metric.limit}
                  </Typography>
                )}
              </Box>
              {!metric.noProgress && (
                <LinearProgress
                  variant="determinate"
                  value={metric.used}
                  color="secondary"
                  sx={{ borderRadius: 2, height: 6, mb: 1.5, bgcolor: 'surface.raised' }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {metric.detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Features */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              Recursos inclusos
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Tudo que faz parte do seu plano
            </Typography>
          </Box>
          <Button
            variant="text"
            endIcon={<ArrowForwardIcon />}
            size="small"
            sx={{ color: 'text.secondary', textDecoration: 'underline' }}
          >
            Comparar planos
          </Button>
        </Box>
        <Divider />
        <Box
          sx={{
            px: 4,
            py: 3,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
          }}
        >
          {PLAN_FEATURES.map((feature) => (
            <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
              <Typography variant="body2" color="text.primary">
                {feature}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Other plans */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Outros planos
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Faça upgrade ou downgrade a qualquer momento
          </Typography>
        </Box>
        <Divider />
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {OTHER_PLANS.map((plan) => (
            <Box
              key={plan.name}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: 2,
                borderColor: plan.current ? 'secondary.main' : 'border.subtle',
                bgcolor: plan.current ? 'success.soft' : 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {plan.name}
                </Typography>
                {plan.current && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                    <Typography variant="caption" color="secondary.main" fontWeight={600}>
                      Atual
                    </Typography>
                  </Box>
                )}
              </Box>

              {plan.price !== null ? (
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    R$
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    {plan.price}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plan.period}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Sob consulta
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary">
                {plan.description}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1 }}>
                {plan.features.map((f) => (
                  <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                    <Typography variant="caption" color="text.primary">
                      {f}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Button
                variant={plan.ctaVariant}
                color={plan.current ? 'inherit' : 'secondary'}
                size="small"
                fullWidth
                disabled={plan.current}
              >
                {plan.cta}
              </Button>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
