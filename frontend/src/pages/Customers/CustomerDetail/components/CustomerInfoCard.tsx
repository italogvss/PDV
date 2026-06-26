import {
  EmailOutlined,
  LocationOnOutlined,
  PersonOutlineRounded,
  PhoneOutlined,
  SearchRounded,
  StarRounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { ReactNode } from 'react'
import SettingCard from '../../../../components/SettingCard'
import type { Customer } from '../../../../types/customers.types'
import { formatPhone, maskCEP, maskDocument } from '../../../../utils/masks'
import { STATES } from '../../../../constants/address'

export interface FormState {
  name: string
  phone: string
  email: string
  document: string
  street: string
  number: string
  city: string
  state: string
  zipCode: string
  note: string
}

interface Props {
  customer: Customer
  form: FormState
  isEditing: boolean
  set: (field: keyof FormState) => (value: string) => void
  locationLabel: string | null
  handleCepSearch: () => void
  searching: boolean
  cepError: string
  setCepError: (v: string) => void
}

export default function CustomerInfoCard({
  customer,
  form,
  isEditing,
  set,
  locationLabel,
  handleCepSearch,
  searching,
  cepError,
  setCepError,
}: Props) {
  return (
    <SettingCard
      title="Dados do cliente"
      subtitle={isEditing ? undefined : 'Clique em Editar para atualizar'}
    >
      {isEditing && (
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <FieldCell label="Nome completo">
            <TextField
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="Nome do cliente"
            />
          </FieldCell>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <FieldCell label="Telefone / WhatsApp" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.phone}
              onChange={(e) => set('phone')(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          ) : (
            <FieldValue value={customer.phone} icon={<PhoneOutlined sx={{ fontSize: 14 }} />} />
          )}
        </FieldCell>
        <FieldCell label="E-mail">
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
            />
          ) : (
            <FieldValue value={customer.email} icon={<EmailOutlined sx={{ fontSize: 14 }} />} />
          )}
        </FieldCell>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <FieldCell label="Documento (CPF / CNPJ)" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.document}
              onChange={(e) => set('document')(maskDocument(e.target.value))}
              placeholder="000.000.000-00"
            />
          ) : (
            <FieldValue value={customer.document} icon={<PersonOutlineRounded sx={{ fontSize: 14 }} />} />
          )}
        </FieldCell>
        <FieldCell label="Cidade / Estado">
          {isEditing ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                sx={{ flex: 1 }}
                value={form.city}
                onChange={(e) => set('city')(e.target.value)}
                placeholder="Cidade"
              />
              <Select
                size="small"
                value={form.state}
                onChange={(e) => set('state')(e.target.value)}
                displayEmpty
                sx={{ width: 90 }}
              >
                <MenuItem value=""><em>UF</em></MenuItem>
                {STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </Box>
          ) : (
            <FieldValue value={locationLabel} icon={<LocationOnOutlined sx={{ fontSize: 14 }} />} />
          )}
        </FieldCell>
      </Box>

      {isEditing && (
        <Box sx={{ px: 4, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
              CEP
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                sx={{ width: 160 }}
                value={form.zipCode}
                onChange={(e) => { setCepError(''); set('zipCode')(maskCEP(e.target.value)) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCepSearch() }}
                placeholder="00000-000"
                error={!!cepError}
                helperText={cepError}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <SearchRounded />}
                onClick={handleCepSearch}
                disabled={searching}
                sx={{ mt: '2px', flexShrink: 0 }}
              >
                Buscar endereço
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                Rua / Logradouro
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={form.street}
                onChange={(e) => set('street')(e.target.value)}
                placeholder="Rua das Flores"
              />
            </Box>
            <Box sx={{ width: 100 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                Número
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={form.number}
                onChange={(e) => set('number')(e.target.value)}
                placeholder="123"
              />
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ px: 4, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <StarRounded sx={{ fontSize: 14, color: 'warning.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
            Anotações internas
          </Typography>
        </Box>
        {isEditing ? (
          <TextField
            multiline
            minRows={3}
            fullWidth
            size="small"
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            placeholder="Observações sobre o cliente..."
          />
        ) : customer.note ? (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 1.5,
              bgcolor: 'warning.soft',
              border: '1px solid',
              borderColor: 'warning.main',
              opacity: 0.8,
            }}
          >
            <Typography variant="body2" color="text.primary">{customer.note}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">Nenhuma anotação</Typography>
        )}
      </Box>
    </SettingCard>
  )
}

function FieldCell({
  label,
  children,
  borderRight,
}: {
  label: string
  children: ReactNode
  borderRight?: boolean
}) {
  return (
    <Box
      sx={{
        px: 4,
        py: 2.5,
        ...(borderRight && { borderRight: '1px solid', borderColor: 'divider' }),
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function FieldValue({ value, icon }: { value: string | null | undefined; icon?: ReactNode }) {
  if (!value) return <Typography variant="body2" color="text.disabled">—</Typography>
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon && <Box sx={{ color: 'text.tertiary', lineHeight: 0 }}>{icon}</Box>}
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}
