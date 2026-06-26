import { zodResolver } from '@hookform/resolvers/zod'
import { WhatsApp } from '@mui/icons-material'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import { z } from 'zod'
import ChipSelect from '../../components/ChipSelect'
import FieldLabel from '../../components/FieldLabel'
import PageHeader from '../../components/PageHeader'
import { useCreateContactMessage } from '../../hooks/useContact'
import type { ContactMessageCategory, Reproducibility } from '../../types/contact.types'

const schema = z.object({
  category: z.enum(['FeatureSuggestion', 'BugReport', 'Compliment', 'Other'] as const),
  subject: z.string().min(1, 'Assunto é obrigatório.').max(80, 'Máximo 80 caracteres.'),
  body: z.string().min(1, 'Mensagem é obrigatória.').max(2000, 'Máximo 2000 caracteres.'),
  expectedBehavior: z.string().max(500, 'Máximo 500 caracteres.').nullable().optional(),
  reproducibility: z
    .enum(['Always', 'Sometimes', 'HappenedOnce'] as const)
    .nullable()
    .optional(),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES: { value: ContactMessageCategory; label: string; icon: React.ReactNode, color?: string }[] = [
  { value: 'FeatureSuggestion', label: 'Sugestão', icon: <LightbulbOutlinedIcon fontSize="small" />, color: "warning.main" },
  { value: 'BugReport', label: 'Relatar bug', icon: <BugReportOutlinedIcon fontSize="small" />, color: "error.main" },
  { value: 'Compliment', label: 'Elogio', icon: <FavoriteOutlinedIcon fontSize="small" />, color: "secondary.main" },
  { value: 'Other', label: 'Outro', icon: <HelpOutlinedIcon fontSize="small" /> },
]

const REPRODUCIBILITY: { value: Reproducibility; label: string }[] = [
  { value: 'Always', label: 'Sempre acontece' },
  { value: 'Sometimes', label: 'Às vezes' },
  { value: 'HappenedOnce', label: 'Aconteceu uma vez' },
]

function summarizeBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return ua.slice(0, 80)
}

export default function ContactPage() {
  const location = useLocation()
  const createMessage = useCreateContactMessage()

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'FeatureSuggestion',
      subject: '',
      body: '',
      expectedBehavior: null,
      reproducibility: null,
    },
  })

  const category = watch('category')
  const isBugReport = category === 'BugReport'

  useEffect(() => {
    if (!isBugReport) {
      reset((prev) => ({ ...prev, expectedBehavior: null, reproducibility: null }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBugReport])

  const onSubmit = (values: FormValues) => {
    createMessage.mutate(
      {
        category: values.category,
        subject: values.subject,
        body: values.body,
        expectedBehavior: isBugReport ? (values.expectedBehavior ?? null) : null,
        reproducibility: isBugReport ? (values.reproducibility ?? null) : null,
        pageContext: location.pathname,
        appVersion: import.meta.env.VITE_APP_VERSION ?? null,
        browser: summarizeBrowser(navigator.userAgent),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        platform: 'web',
      },
      { onSuccess: () => reset() },
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <PageHeader
        title='Fale com o desenvolvedor'
        description='Sugestões, bugs ou elogios — toda mensagem é lida com atenção.'
      />

      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Formulário */}
        <Box sx={{ flex: '1 1 520px', minWidth: 0 }}>
          <Card variant="outlined" sx={{ borderColor: 'border.subtle' }}>
            <CardContent sx={{ p: 4 }}>
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                {/* Categoria */}
                <Box>
                  <FieldLabel label="Categoria" required />
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <ChipSelect
                        size="large"
                        colorMode="fill"
                        options={CATEGORIES.map((c) => ({ id: c.value, label: c.label, icon: c.icon, color: c.color }))}
                        value={field.value}
                        onChange={(val) => { if (val) field.onChange(val) }}
                      />
                    )}
                  />
                </Box>

                {/* Assunto */}
                <Box>
                  <FieldLabel label="Assunto" required />
                  <Controller
                    name="subject"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        placeholder="Resumo em até 80 caracteres"
                        error={!!errors.subject}
                        helperText={errors.subject?.message}
                        slotProps={{ htmlInput: { maxLength: 80 } }}
                      />
                    )}
                  />
                </Box>

                {/* Mensagem */}
                <Box>
                  <FieldLabel label="Mensagem" required />
                  <Controller
                    name="body"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        minRows={5}
                        placeholder="Descreva mais detalhes..."
                        error={!!errors.body}
                        helperText={errors.body?.message}
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
                      />
                    )}
                  />
                </Box>

                {/* Campos exclusivos de BugReport */}
                <Collapse in={isBugReport}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    <Box>
                      <FieldLabel label="Comportamento esperado" />
                      <Controller
                        name="expectedBehavior"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="O que deveria ter acontecido?"
                            error={!!errors.expectedBehavior}
                            helperText={errors.expectedBehavior?.message}
                            slotProps={{ htmlInput: { maxLength: 500 } }}
                          />
                        )}
                      />
                    </Box>

                    <Box>
                      <FieldLabel label="Com que frequência o bug ocorre?" />
                      <Controller
                        name="reproducibility"
                        control={control}
                        render={({ field }) => (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {REPRODUCIBILITY.map((opt) => {
                              const selected = field.value === opt.value
                              return (
                                <Chip
                                  size="large"
                                  key={opt.value}
                                  label={opt.label}
                                  onClick={() => field.onChange(selected ? null : opt.value)}
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: selected ? 'text.primary' : 'transparent',
                                    color: selected ? 'background.paper' : 'text.secondary',
                                    border: 1,
                                    borderColor: selected ? 'text.primary' : 'border.subtle',
                                    '&:hover': {
                                      bgcolor: selected ? 'text.primary' : 'surface.raised',
                                    },
                                  }}
                                />
                              )
                            })}
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                </Collapse>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={createMessage.isPending}
                    startIcon={
                      createMessage.isPending ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <SendOutlinedIcon />
                      )
                    }
                  >
                    {createMessage.isPending ? 'Enviando...' : 'Enviar mensagem'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Informações de contato */}
        <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 280px' }, width: { xs: '100%', sm: 250 } }}>
          <Card variant="outlined" sx={{ borderColor: 'border.subtle', backgroundColor: "surface.sunken" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}
              >
                Ítalo Gavassi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Desenvolvedor e Proprietário de PDV-Ultra
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    italo.gavassi@gmail.com
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <WhatsApp sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    + 45 991377068
                  </Typography>
                </Box>


                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GitHubIcon sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    github.com/italogvss
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LinkedInIcon sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    linkedin.com/in/italoggvss
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'border.subtle', my: 3 }} />

              <Typography variant="caption" color="text.tertiary" sx={{ lineHeight: 1.6 }}>
                Todas as mensagens são registradas e lidas diretamente pelo desenvolvedor. Todo feedback faz diferença.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
