import {
  EmailOutlined,
  LocationOnOutlined,
  PersonOutlineRounded,
  PhoneOutlined,
} from '@mui/icons-material'
import {
  Box,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import DetailFieldCell, { DetailFieldValue } from '../../../../components/DetailFieldCell'
import AddressEditFields from '../../../../components/AddressEditFields'
import type { Supplier } from '../../../../types/supplier.types'
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
}

interface Props {
  supplier: Supplier
  form: FormState
  isEditing: boolean
  set: (field: keyof FormState) => (value: string) => void
  locationLabel: string | null
  handleCepSearch: () => void
  searching: boolean
  cepError: string
  setCepError: (v: string) => void
}

export default function SupplierInfoCard({
  supplier,
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
      title="Dados do fornecedor"
      subtitle={isEditing ? undefined : 'Clique em Editar para atualizar'}
    >
      {isEditing && (
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <DetailFieldCell label="Nome / Razão social">
            <TextField
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="Nome do fornecedor"
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
            <DetailFieldValue value={supplier.phone} icon={<PhoneOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
        <DetailFieldCell label="E-mail">
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              placeholder="contato@fornecedor.com"
              type="email"
            />
          ) : (
            <DetailFieldValue value={supplier.email} icon={<EmailOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <DetailFieldCell label="CNPJ / CPF" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.document}
              onChange={(e) => set('document')(maskDocument(e.target.value))}
              placeholder="00.000.000/0000-00"
            />
          ) : (
            <DetailFieldValue value={supplier.document} icon={<PersonOutlineRounded sx={{ fontSize: 14 }} />} />
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
    </SettingCard>
  )
}
