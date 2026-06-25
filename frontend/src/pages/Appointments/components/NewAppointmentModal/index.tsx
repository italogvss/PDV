import { zodResolver } from '@hookform/resolvers/zod'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import ContentCutOutlined from '@mui/icons-material/ContentCutOutlined'
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined'
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  FormHelperText,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { MuiColorInput } from 'mui-color-input'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import type { Appointment, AppointmentServiceRef } from '../../../../types/appointment.types'
import type { Service } from '../../../../types/service.types'
import { formatBRL } from '../../../../utils/currency'
import { formatPhone } from '../../../../utils/masks'
import { conflictsFor, formatHM } from '../appointmentHelpers'
import type { NewAppointmentModalProps } from './types'

const APPOINTMENT_COLORS = [
  '#ef4444', // vermelho
  '#f97316', // laranja
  '#eab308', // amarelo
  '#22c55e', // verde
  '#3b82f6', // azul
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#14b8a6', // teal
]

const schema = z.object({
  customerName: z.string().min(1, 'Cliente é obrigatório').max(200),
  phone: z.string()
    .refine(v => !v || [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido'),
  serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço'),
  employeeId: z.string().min(1, 'Selecione o profissional'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().min(1, 'Horário é obrigatório'),
  duration: z
    .number({ message: 'Duração inválida' })
    .positive('Duração deve ser maior que zero'),
  price: z.number({ message: 'Valor inválido' }).min(0),
  status: z.enum(['confirmado', 'pendente']),
  note: z.string().max(1000),
  color: z.string(),
})

type FormValues = z.infer<typeof schema>

function buildEmptyValues(date: string): FormValues {
  return {
    customerName: '',
    phone: '',
    serviceIds: [],
    employeeId: '',
    date,
    time: dayjs().add(1, 'hour').startOf('hour').format('HH:mm'),
    duration: 0,
    price: 0,
    status: 'confirmado',
    note: '',
    color: '',
  }
}

function toServiceRef(service: Service): AppointmentServiceRef {
  return {
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes ?? 30,
    price: service.price,
    categoryColor: service.category?.color ?? '#807d75',
  }
}

export default function NewAppointmentModal({
  open,
  onClose,
  professionals,
  services,
  customers,
  appointments,
  prefill,
  defaultDate,
  onCreate,
}: NewAppointmentModalProps) {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [durationTouched, setDurationTouched] = useState(false)
  const [priceTouched, setPriceTouched] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildEmptyValues(defaultDate.format('YYYY-MM-DD')),
  })

  // Reset ao abrir, aplicando prefill (profissional/horário) quando houver.
  useEffect(() => {
    if (!open) return
    const base = buildEmptyValues(defaultDate.format('YYYY-MM-DD'))
    if (prefill?.employeeId) base.employeeId = prefill.employeeId
    if (prefill?.start) {
      base.date = dayjs(prefill.start).format('YYYY-MM-DD')
      base.time = dayjs(prefill.start).format('HH:mm')
    }
    reset(base)
    setCustomerId(null)
    setDurationTouched(false)
    setPriceTouched(false)
  }, [open, prefill, defaultDate, reset])

  // Serviços agrupados por categoria.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; color: string; items: Service[] }>()
    for (const s of services.filter((x) => x.isActive)) {
      const key = s.category?.id ?? 'none'
      if (!map.has(key)) {
        map.set(key, {
          name: s.category?.name ?? 'Outros',
          color: s.category?.color ?? '#807d75',
          items: [],
        })
      }
      map.get(key)!.items.push(s)
    }
    return [...map.values()]
  }, [services])

  const selectedIds = watch('serviceIds')
  const employeeId = watch('employeeId')
  const date = watch('date')
  const time = watch('time')
  const duration = watch('duration')

  function applyServiceTotals(ids: string[]) {
    const chosen = services.filter((s) => ids.includes(s.id))
    if (!durationTouched) {
      setValue('duration', chosen.reduce((sum, s) => sum + (s.durationMinutes ?? 30), 0))
    }
    if (!priceTouched) {
      setValue('price', chosen.reduce((sum, s) => sum + s.price, 0))
    }
  }

  function toggleService(id: string) {
    const current = getValues('serviceIds')
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setValue('serviceIds', next, { shouldValidate: true })
    applyServiceTotals(next)
  }

  // Resumo de horário + conflito.
  const startIso = date && time ? dayjs(`${date}T${time}`).toISOString() : null
  const endLabel =
    startIso && duration > 0 ? formatHM(dayjs(startIso).add(duration, 'minute').toISOString()) : null
  const conflicts =
    startIso && employeeId && duration > 0
      ? conflictsFor(appointments, employeeId, startIso, duration)
      : []

  function finalize(data: FormValues) {
    const start = dayjs(`${data.date}T${data.time}`).toISOString()
    const serviceRefs = services
      .filter((s) => data.serviceIds.includes(s.id))
      .map(toServiceRef)
    const employeeName = professionals.find((p) => p.id === data.employeeId)?.name ?? ''
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      customerId,
      customerName: data.customerName,
      customerPhone: data.phone.trim() || undefined,
      employeeId: data.employeeId,
      employeeName,
      services: serviceRefs,
      start,
      durationMinutes: data.duration,
      price: data.price,
      status: data.status,
      note: data.note.trim(),
      color: data.color || undefined,
    }
    onCreate(appointment)
    onClose()
  }

  const onSubmit = (data: FormValues) => {
    finalize(data)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title="Novo agendamento"
        subtitle="Reserve um horário para um cliente"
        onClose={onClose}
      />

      <DialogContent>
        <Box
          component="form"
          id="new-appointment-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}
        >
          {/* Cliente + Telefone */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Cliente" required />
              <Controller
                name="customerName"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={customers}
                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
                    inputValue={field.value}
                    onInputChange={(_, value) => {
                      field.onChange(value)
                      const match = customers.find((c) => c.name === value)
                      setCustomerId(match ? match.id : null)
                      if (match) setValue('phone', match.phone ?? '')
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Nome do cliente"
                        error={!!errors.customerName}
                        helperText={errors.customerName?.message}
                      />
                    )}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Telefone / WhatsApp" />
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    placeholder="(99) 99999-9999"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Serviços */}
          <Box>
            <FieldLabel label="Serviços" required />
            <Box
              sx={{
                maxHeight: 180,
                overflowY: 'auto',
                p: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: errors.serviceIds ? 'error.main' : 'border.subtle',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {groups.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <ContentCutOutlined sx={{ fontSize: 28, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Nenhum serviço cadastrado ainda.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { onClose(); navigate('/servicos') }}
                  >
                    Ir para Serviços
                  </Button>
                </Box>
              ) : (
                groups.map((group) => (
                  <Box key={group.name}>
                    <Typography
                      variant="caption"
                      color="text.tertiary"
                      sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
                    >
                      {group.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {group.items.map((service) => {
                        const selected = selectedIds.includes(service.id)
                        return (
                          <Chip
                            key={service.id}
                            clickable
                            size="large"
                            onClick={() => toggleService(service.id)}
                            variant={selected ? 'filled' : 'outlined'}
                            label={`${service.name} · ${service.durationMinutes ?? 30}min`}
                            sx={
                              selected
                                ? {
                                  bgcolor: 'text.primary',
                                  color: 'background.paper',
                                  fontWeight: 600,
                                  '&:hover': { bgcolor: 'text.primary' },
                                }
                                : { borderColor: 'border.subtle', color: 'text.secondary' }
                            }
                          />
                        )
                      })}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
            {errors.serviceIds && (
              <FormHelperText error sx={{ mt: 0.5 }}>
                {errors.serviceIds.message}
              </FormHelperText>
            )}
            {selectedIds.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {services
                  .filter((s) => selectedIds.includes(s.id))
                  .map((s) => (
                    <Box
                      key={s.id}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        {s.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatBRL(s.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {s.durationMinutes ?? 30}min
                      </Typography>
                    </Box>
                  ))}
              </Box>
            )}
          </Box>

          {/* Profissional */}
          <Box>
            <FieldLabel label="Profissional" required />
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Box>
                  {professionals.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 2,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'border.subtle',
                      }}
                    >
                      <PeopleOutlined sx={{ fontSize: 28, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Nenhum funcionário cadastrado ainda.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => { onClose(); navigate('/funcionarios') }}
                      >
                        Ir para Funcionários
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {professionals.map((pro) => {
                          const selected = field.value === pro.id
                          return (
                            <Chip
                              key={pro.id}
                              clickable
                              size="large"
                              onClick={() => field.onChange(pro.id)}
                              variant={selected ? 'filled' : 'outlined'}
                              label={pro.name}
                              sx={
                                selected
                                  ? {
                                    bgcolor: 'text.primary',
                                    color: 'background.paper',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: 'text.primary' },
                                  }
                                  : { borderColor: 'border.subtle', color: 'text.secondary' }
                              }
                            />
                          )
                        })}
                      </Box>
                      {errors.employeeId && (
                        <FormHelperText error sx={{ mt: 0.5 }}>
                          {errors.employeeId.message}
                        </FormHelperText>
                      )}
                    </>
                  )}
                </Box>
              )}
            />
          </Box>

          {/* Data + Horário */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Data" required />
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : '')}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.date,
                        helperText: errors.date?.message,
                      },
                    }}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Horário" required />
              <TextField
                {...register('time')}
                type="time"
                fullWidth
                error={!!errors.time}
                helperText={errors.time?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { step: 300 },
                }}
              />
            </Box>
          </Box>

          {/* Duração + Valor */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Duração" required />
              <TextField
                {...register('duration', {
                  valueAsNumber: true,
                  onChange: () => setDurationTouched(true),
                })}
                type="number"
                fullWidth
                error={!!errors.duration}
                helperText={errors.duration?.message}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">min</InputAdornment> },
                  htmlInput: { min: 0, step: 5 },
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Valor" />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    value={Number(field.value) || 0}
                    onChange={(v) => {
                      setPriceTouched(true)
                      field.onChange(v)
                    }}
                    onBlur={field.onBlur}
                    fullWidth
                    error={!!errors.price}
                    helperText={errors.price?.message}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Resumo de horário + conflito */}
          {endLabel && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: conflicts.length ? 'warning.soft' : 'surface.sunken',
                color: conflicts.length ? 'warning.ink' : 'text.secondary',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventAvailableOutlined sx={{ fontSize: 17 }} />
                <Typography variant="body2">
                  Término previsto {formatHM(startIso!)}–{endLabel}
                </Typography>
              </Box>
              {conflicts.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventBusyOutlined sx={{ fontSize: 17 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    Conflito com {conflicts[0].customerName} ({formatHM(conflicts[0].start)})
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Situação */}
          <Box>
            <FieldLabel label="Situação" />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {(
                    [
                      { value: 'confirmado', label: 'Confirmado', bgcolor: 'success.main' },
                      { value: 'pendente', label: 'Aguardando confirmação', bgcolor: 'warning.main' },
                    ] as const
                  ).map((opt) => {
                    const selected = field.value === opt.value
                    return (
                      <Chip
                        key={opt.value}
                        clickable
                        size="large"
                        onClick={() => field.onChange(opt.value)}
                        variant={selected ? 'filled' : 'outlined'}
                        label={opt.label}
                        sx={
                          selected
                            ? {
                              bgcolor: opt.bgcolor,
                              color: 'background.paper',
                              fontWeight: 600,
                              '&:hover': { bgcolor: opt.bgcolor },
                            }
                            : { borderColor: 'border.subtle', color: 'text.secondary', '&:hover': { bgcolor: 'primary.main'}, }
                        }
                      />
                    )
                  })}
                </Box>
              )}
            />
          </Box>

          {/* Cor */}
          <Box>
            <FieldLabel label="Cor do agendamento" />
            <Controller
              name="color"
              control={control}
              render={({ field }) => {
                const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(field.value)
                const isCustom = isValidColor && !APPOINTMENT_COLORS.includes(field.value)
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    <Box
                      onClick={() => field.onChange('')}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: !field.value ? 'text.primary' : 'transparent',
                        bgcolor: 'surface.sunken',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.1s',
                        '&:hover': { borderColor: 'text.primary' },
                      }}
                    >
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
                        —
                      </Typography>
                    </Box>
                    {APPOINTMENT_COLORS.map((c) => (
                      <Box
                        key={c}
                        onClick={() => field.onChange(c)}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          bgcolor: c,
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: field.value === c ? 'text.primary' : 'transparent',
                          transition: 'border-color 0.1s',
                          '&:hover': { borderColor: 'text.primary' },
                        }}
                      />
                    ))}
                    <Box
                      title="Cor personalizada"
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isCustom ? 'text.primary' : 'border.subtle',
                        bgcolor: isCustom ? field.value : 'surface.sunken',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'border-color 0.1s',
                        '&:hover': { opacity: 0.85 },
                      }}
                    >
                      <PaletteRounded sx={{ fontSize: 14, color: isCustom ? 'common.white' : 'text.secondary', pointerEvents: 'none', position: 'relative', zIndex: 1 }} />
                      <MuiColorInput
                        format="hex"
                        value={isValidColor ? field.value : '#10128b'}
                        onChange={(color) => field.onChange(color)}
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          '& .MuiInputBase-root': { p: 0, height: '100%', minHeight: 0 },
                          '& input': { display: 'none' },
                          '& .MuiInputAdornment-root': { m: 0, height: '100%', maxHeight: 'none' },
                          '& button': { position: 'absolute', inset: 0, width: '100%', height: '100%', minWidth: 0, p: 0 },
                          '& fieldset': { display: 'none' },
                        }}
                      />
                    </Box>
                  </Box>
                )
              }}
            />
          </Box>

          {/* Observações */}
          <Box>
            <FieldLabel label="Observações" />
            <TextField
              {...register('note')}
              fullWidth
              multiline
              minRows={2}
              placeholder="Preferências, alergias, foto de referência..."
            />
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="new-appointment-form"
        onCancel={onClose}
        isPending={false}
        submitLabel="Agendar"
        submitDisabled={conflicts.length > 0}
        hint="Confirmação enviada por WhatsApp ao salvar"
      />
    </Dialog>
  )
}
