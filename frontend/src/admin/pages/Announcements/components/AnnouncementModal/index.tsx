import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { VisibilityOutlined } from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs, { type Dayjs } from 'dayjs'
import ModalHeader from '../../../../../components/ModalHeader'
import FormModalActions from '../../../../../components/FormModalActions'
import FieldLabel from '../../../../../components/FieldLabel'
import AnnouncementContent from '../../../../../components/AnnouncementCenter/AnnouncementContent'
import UserAnnouncementModal from '../../../../../components/AnnouncementCenter/AnnouncementModal'
import { ANNOUNCEMENT_PLAN_TARGETS, ANNOUNCEMENT_TYPE } from '../../../../constants/statusMeta'
import { useCreateAnnouncement, useUpdateAnnouncement } from '../../../../hooks/useAdmin'
import type { AdminAnnouncement, AnnouncementPayload } from '../../../../types/admin.types'

const schema = z.object({
  title: z.string().trim().min(1, 'Informe o título.'),
  body: z.string().trim().min(1, 'Informe o conteúdo.'),
  type: z.string(),
  priority: z.number(),
  targetPlanCode: z.string(),
  targetRole: z.string(),
  imageUrl: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  title: '',
  body: '',
  type: 'Info',
  priority: 0,
  targetPlanCode: '',
  targetRole: '',
  imageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  isActive: true,
}

const ROLE_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'Owner', label: 'Owner' },
  { value: 'Employee', label: 'Employee' },
  { value: 'Admin', label: 'Admin' },
]

interface Props {
  open: boolean
  announcement: AdminAnnouncement | null // null = criar
  onClose: () => void
}

export default function AnnouncementModal({ open, announcement, onClose }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement()
  const isEditing = announcement !== null
  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending

  const [publishAt, setPublishAt] = useState<Dayjs | null>(null)
  const [expiresAt, setExpiresAt] = useState<Dayjs | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  // Preview lê os valores atuais do formulário — reflete o que está sendo digitado, antes de salvar.
  const preview = watch()

  useEffect(() => {
    if (!open) return
    if (announcement) {
      reset({
        title: announcement.title,
        body: announcement.body,
        type: announcement.type,
        priority: announcement.priority,
        targetPlanCode: announcement.targetPlanCode ?? '',
        targetRole: announcement.targetRole ?? '',
        imageUrl: announcement.imageUrl ?? '',
        ctaLabel: announcement.ctaLabel ?? '',
        ctaUrl: announcement.ctaUrl ?? '',
        isActive: announcement.isActive,
      })
      setPublishAt(announcement.publishAt ? dayjs(announcement.publishAt) : null)
      setExpiresAt(announcement.expiresAt ? dayjs(announcement.expiresAt) : null)
    } else {
      reset(DEFAULTS)
      setPublishAt(null)
      setExpiresAt(null)
    }
    setPreviewOpen(false)
  }, [open, announcement, reset])

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    const payload: AnnouncementPayload = {
      title: values.title,
      body: values.body,
      type: values.type,
      priority: values.priority,
      imageUrl: values.imageUrl.trim() || null,
      ctaLabel: values.ctaLabel.trim() || null,
      ctaUrl: values.ctaUrl.trim() || null,
      publishAt: publishAt ? publishAt.startOf('day').toISOString() : null,
      expiresAt: expiresAt ? expiresAt.endOf('day').toISOString() : null,
      targetPlanCode: values.targetPlanCode || null,
      targetRole: values.targetRole || null,
      isActive: values.isActive,
    }
    if (announcement) {
      updateAnnouncement.mutate({ id: announcement.id, payload }, { onSuccess: onClose })
    } else {
      createAnnouncement.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <ModalHeader
        title={isEditing ? 'Editar anúncio' : 'Novo anúncio'}
        subtitle="Aviso editorial exibido para os usuários no app."
        onClose={handleClose}
        disabled={isPending}
      />
      <DialogContent>
        <Box
          component="form"
          id="announcement-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box>
            <FieldLabel label="Título" required />
            <TextField {...register('title')} fullWidth size="small" error={!!errors.title} helperText={errors.title?.message} />
          </Box>

          <Box>
            <FieldLabel label="Conteúdo (markdown)" required />
            <TextField {...register('body')} fullWidth size="small" multiline minRows={4} error={!!errors.body} helperText={errors.body?.message} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Tipo" />
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small">
                    {Object.entries(ANNOUNCEMENT_TYPE).map(([value, meta]) => (
                      <MenuItem key={value} value={value}>
                        {meta.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
            <Box>
              <FieldLabel label="Prioridade" />
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <TextField
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    onBlur={field.onBlur}
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Publicar em" />
              <DatePicker
                value={publishAt}
                onChange={setPublishAt}
                slotProps={{ textField: { size: 'small', fullWidth: true }, field: { clearable: true } }}
              />
            </Box>
            <Box>
              <FieldLabel label="Expira em" />
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                minDate={publishAt ?? undefined}
                slotProps={{ textField: { size: 'small', fullWidth: true }, field: { clearable: true } }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Plano-alvo" />
              <Controller
                control={control}
                name="targetPlanCode"
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small">
                    {ANNOUNCEMENT_PLAN_TARGETS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
            <Box>
              <FieldLabel label="Papel-alvo" />
              <Controller
                control={control}
                name="targetRole"
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small">
                    {ROLE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel label="Imagem (URL)" />
            <TextField {...register('imageUrl')} fullWidth size="small" placeholder="https://..." />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Texto do botão (CTA)" />
              <TextField {...register('ctaLabel')} fullWidth size="small" />
            </Box>
            <Box>
              <FieldLabel label="Link do botão (CTA)" />
              <TextField {...register('ctaUrl')} fullWidth size="small" placeholder="https://..." />
            </Box>
          </Box>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={field.value ? 'Ativo — exibido para os usuários' : 'Inativo — não é exibido'}
              />
            )}
          />
        </Box>
      </DialogContent>
      <FormModalActions
        formId="announcement-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar' : 'Criar anúncio'}
        extraActions={
          <Button
            variant="soft"
            startIcon={<VisibilityOutlined />}
            onClick={() => setPreviewOpen(true)}
            disabled={isPending}
          >
            Pré-visualizar
          </Button>
        }
      />

      {/* Exatamente o modal que o lojista vê — mesmo componente, mesmo corpo. `dismissible` porque
          aqui fechar é só fechar o preview (no app, fechar marca o aviso como visto). */}
      <UserAnnouncementModal
        open={previewOpen}
        title={preview.title}
        onClose={() => setPreviewOpen(false)}
        ctaLabel={preview.ctaLabel.trim() || undefined}
        ctaUrl={preview.ctaUrl.trim() || undefined}
        dismissible
      >
        <AnnouncementContent imageUrl={preview.imageUrl.trim() || undefined} body={preview.body} />
      </UserAnnouncementModal>
    </Dialog>
  )
}
