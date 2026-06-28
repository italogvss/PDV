import {
  EmailOutlined,
  LocationOnOutlined,
  PersonOutlineRounded,
  PhoneOutlined,
  StarRounded,
} from '@mui/icons-material'
import {
  Box,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import DetailFieldCell, { DetailFieldValue } from '../../../../components/DetailFieldCell'
import AddressEditFields from '../../../../components/AddressEditFields'
import type { Customer } from '../../../../types/customers.types'
import { formatPhone, maskDocument } from '../../../../utils/masks'
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
          <DetailFieldCell label="Nome completo">
            <TextField
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="Nome do cliente"
            />
          </DetailFieldCell>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <DetailFieldCell label="Telefone / WhatsApp" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.phone}
              onChange={(e) => set('phone')(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          ) : (
            <DetailFieldValue value={customer.phone} icon={<PhoneOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
        <DetailFieldCell label="E-mail">
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
            <DetailFieldValue value={customer.email} icon={<EmailOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <DetailFieldCell label="Documento (CPF / CNPJ)" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.document}
              onChange={(e) => set('document')(maskDocument(e.target.value))}
              placeholder="000.000.000-00"
            />
          ) : (
            <DetailFieldValue value={customer.document} icon={<PersonOutlineRounded sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
        <DetailFieldCell label="Cidade / Estado">
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
            <DetailFieldValue value={locationLabel} icon={<LocationOnOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
      </Box>

      {isEditing && (
        <AddressEditFields
          zipCode={form.zipCode}
          street={form.street}
          number={form.number}
          onZipCodeChange={set('zipCode')}
          onStreetChange={set('street')}
          onNumberChange={set('number')}
          onCepSearch={handleCepSearch}
          searching={searching}
          cepError={cepError}
          onCepErrorClear={() => setCepError('')}
        />
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
