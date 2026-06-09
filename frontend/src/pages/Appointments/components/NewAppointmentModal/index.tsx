import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined'
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Service } from '../../../../types/service.types'
import type { Appointment, AppointmentServiceRef } from '../../../../types/appointment.types'
import { conflictsFor, formatHM } from '../appointmentHelpers'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'
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
  customerName: z.string().min(1, 'Cliente é obrigatório'),
  phone: z.string(),
  serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço'),
  employeeId: z.string().min(1, 'Selecione o profissional'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().min(1, 'Horário é obrigatório'),
  duration: z
    .number({ message: 'Duração inválida' })
    .positive('Duração deve ser maior que zero'),
  price: z.number({ message: 'Valor inválido' }).min(0),
  status: z.enum(['confirmado', 'pendente']),
  note: z.string(),
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
    time: '09:00',
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
  const [conflictData, setConflictData] = useState<FormValues | null>(null)

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
    setConflictData(null)
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
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      customerId,
      customerName: data.customerName,
      customerPhone: data.phone.trim() || undefined,
      employeeId: data.employeeId,
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
    const start = dayjs(`${data.date}T${data.time}`).toISOString()
    const hits = conflictsFor(appointments, data.employeeId, start, data.duration)
    if (hits.length > 0) {
      setConflictData(data)
      return
    }
    finalize(data)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
              <TextField
                {...register('phone')}
                fullWidth
                placeholder="(00) 00000-0000"
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
              {groups.map((group) => (
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
              ))}
            </Box>
            {errors.serviceIds && (
              <FormHelperText error sx={{ mt: 0.5 }}>
                {errors.serviceIds.message}
              </FormHelperText>
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
                      { value: 'confirmado', label: 'Confirmado' },
                      { value: 'pendente', label: 'Aguardando confirmação' },
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
              )}
            />
          </Box>

          {/* Cor */}
          <Box>
            <FieldLabel label="Cor do agendamento" />
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => field.onChange('')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') field.onChange('') }}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: !field.value ? 'text.primary' : 'border.subtle',
                      bgcolor: 'surface.sunken',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {!field.value && (
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
                        —
                      </Typography>
                    )}
                  </Box>
                  {APPOINTMENT_COLORS.map((c) => (
                    <Box
                      key={c}
                      role="button"
                      tabIndex={0}
                      onClick={() => field.onChange(c)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') field.onChange(c) }}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: c,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: field.value === c ? 'text.primary' : 'transparent',
                        outline: field.value === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        transition: 'outline 0.15s',
                      }}
                    />
                  ))}
                  {(() => {
                    const isCustom = !!field.value && !APPOINTMENT_COLORS.includes(field.value)
                    return (
                      <Box
                        component="label"
                        title="Cor personalizada"
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: isCustom ? 'text.primary' : 'border.subtle',
                          outline: isCustom ? `2px solid ${field.value}` : 'none',
                          outlineOffset: '2px',
                          bgcolor: isCustom ? field.value : 'surface.sunken',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'outline 0.15s',
                        }}
                      >
                        <input
                          type="color"
                          value={field.value || '#000000'}
                          onChange={(e) => field.onChange(e.target.value)}
                          style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                        {!isCustom && (
                          <PaletteRounded sx={{ fontSize: 14, color: 'text.secondary', pointerEvents: 'none' }} />
                        )}
                      </Box>
                    )
                  })()}
                </Box>
              )}
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
        hint="Confirmação enviada por WhatsApp ao salvar"
      />

      {/* Confirmação de conflito (R4: avisa, não bloqueia) */}
      <Dialog open={!!conflictData} onClose={() => setConflictData(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Conflito de horário</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Há outro atendimento do mesmo profissional nesse horário. Deseja agendar mesmo assim?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="ghost" onClick={() => setConflictData(null)}>
            Voltar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (conflictData) finalize(conflictData)
              setConflictData(null)
            }}
          >
            Agendar mesmo assim
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
