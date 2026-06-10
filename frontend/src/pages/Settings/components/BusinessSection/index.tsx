import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  CircularProgress,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import SearchIcon from '@mui/icons-material/Search'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ImageUpload from '../../../../components/ImageUpload'
import { BlockOutlined } from '@mui/icons-material'
import { useTenantSettings, useUpdateBusinessSettings } from '../../../../hooks/useTenantSettings'
import { useUploadImage, useRemoveImage } from '../../../../hooks/useMediaUpload'
import { useAppSelector } from '../../../../store'
import { maskCNPJ, formatPhone, maskCEP } from '../../../../utils/masks'
import type { BusinessAddress, BusinessSettings } from '../../../../types/settings.types'

const TENANT_QUERY_KEY = ['tenant-settings'] as const

export default function BusinessSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdateBusinessSettings()
  const { tenantId } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState<BusinessSettings | null>(null)
  const initialized = useRef(false)

  const uploadLogo = useUploadImage('Tenant', TENANT_QUERY_KEY)
  const removeLogo = useRemoveImage('Tenant', TENANT_QUERY_KEY)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm({
        ...data.business,
        cnpj: maskCNPJ(data.business.cnpj),
        phone: formatPhone(data.business.phone),
        address: { ...data.business.address, cep: maskCEP(data.business.address.cep) },
      })
      initialized.current = true
    }
  }, [data])

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const set = (patch: Partial<BusinessSettings>) =>
    setForm((f) => (f ? { ...f, ...patch } : f))
  const setAddress = (patch: Partial<BusinessAddress>) =>
    setForm((f) => (f ? { ...f, address: { ...f.address, ...patch } } : f))

  const hasChanges = (() => {
    if (!form || !data) return false
    const orig = data.business
    return (
      form.fantasyName !== orig.fantasyName ||
      form.companyName !== orig.companyName ||
      form.cnpj.replace(/\D/g, '') !== orig.cnpj.replace(/\D/g, '') ||
      form.stateRegistration !== orig.stateRegistration ||
      form.segment !== orig.segment ||
      form.phone.replace(/\D/g, '') !== orig.phone.replace(/\D/g, '') ||
      form.taxRegime !== orig.taxRegime ||
      form.address.cep.replace(/\D/g, '') !== orig.address.cep.replace(/\D/g, '') ||
      form.address.street !== orig.address.street ||
      form.address.number !== orig.address.number ||
      form.address.complement !== orig.address.complement ||
      form.address.neighborhood !== orig.address.neighborhood ||
      form.address.city !== orig.address.city ||
      form.address.state !== orig.address.state
    )
  })()

  const handleSave = () => {
    if (!form) return
    update.mutate({
      ...form,
      cnpj: form.cnpj.replace(/\D/g, ''),
      phone: form.phone.replace(/\D/g, ''),
      address: { ...form.address, cep: form.address.cep.replace(/\D/g, '') },
    })
  }

  const handleCancel = () => {
    if (!data) return
    setForm({
      ...data.business,
      cnpj: maskCNPJ(data.business.cnpj),
      phone: formatPhone(data.business.phone),
      address: { ...data.business.address, cep: maskCEP(data.business.address.cep) },
    })
  }

  const handleLogoUpload = (file: File) => {
    if (!tenantId) return
    uploadLogo.mutate({ file, entityId: tenantId })
  }

  const handleLogoRemove = () => {
    if (!tenantId) return
    removeLogo.mutate(tenantId)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Dados do estabelecimento"
        subtitle="Aparece em recibos, faturas e relatórios"
        action={
          hasChanges ? (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={handleCancel} disabled={update.isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={update.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                onClick={handleSave}
                disabled={update.isPending}
              >
                Salvar alterações
              </Button>
            </Box>
          ) : undefined
        }
      >
        <SettingRow label="Logo" sublabel="JPG, PNG ou WebP até 5MB" alignItems="center">
          <ImageUpload
            currentUrl={data?.business.logoUrl ?? null}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
            isLoading={uploadLogo.isPending || removeLogo.isPending}
            shape="square"
            size={72}
          />
        </SettingRow>

        <SettingRow label="Nome fantasia">
          <TextField
            size="small"
            value={form.fantasyName}
            onChange={(e) => set({ fantasyName: e.target.value })}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Razão social">
          <TextField
            size="small"
            value={form.companyName}
            onChange={(e) => set({ companyName: e.target.value })}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="CNPJ" sublabel="Usado em emissão fiscal">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={form.cnpj}
              onChange={(e) => set({ cnpj: maskCNPJ(e.target.value) })}
              placeholder="00.000.000/0000-00"
              sx={{ width: 200 }}
            />
            <Chip
              label="Validado"
              size="small"
              icon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                bgcolor: 'success.soft',
                color: 'success.ink',
                fontWeight: 600,
                '& .MuiChip-icon': { color: 'success.ink' },
              }}
            />
          </Box>
        </SettingRow>

        <SettingRow label="Inscrição estadual">
          <TextField
            size="small"
            value={form.stateRegistration}
            onChange={(e) => set({ stateRegistration: e.target.value })}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Segmento">
          <FormControl size="small" sx={{ width: 340 }}>
            <Select value={form.segment} onChange={(e) => set({ segment: e.target.value })}>
              <MenuItem value="cafeteria">Cafeteria / Padaria</MenuItem>
              <MenuItem value="restaurante">Restaurante</MenuItem>
              <MenuItem value="mercado">Mercado / Mercearia</MenuItem>
              <MenuItem value="farmacia">Farmácia</MenuItem>
              <MenuItem value="vestuario">Vestuário</MenuItem>
              <MenuItem value="eletronicos">Eletrônicos</MenuItem>
              <MenuItem value="servicos">Prestação de Serviços</MenuItem>
              <MenuItem value="outro">Outro</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Telefone público">
          <TextField
            size="small"
            value={form.phone}
            onChange={(e) => set({ phone: formatPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            sx={{ width: 340 }}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Endereço">
        <SettingRow label="CEP">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={form.address.cep}
              onChange={(e) => setAddress({ cep: maskCEP(e.target.value) })}
              placeholder="00000-000"
              sx={{ width: 140 }}
            />
            <Button variant="outlined" size="small" startIcon={<SearchIcon />}>
              Buscar
            </Button>
          </Box>
        </SettingRow>

        <SettingRow label="Rua">
          <TextField
            size="small"
            value={form.address.street}
            onChange={(e) => setAddress({ street: e.target.value })}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Número / Complemento">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              value={form.address.number}
              onChange={(e) => setAddress({ number: e.target.value })}
              sx={{ width: 100 }}
              placeholder="Nº"
            />
            <TextField
              size="small"
              value={form.address.complement ?? ''}
              onChange={(e) => setAddress({ complement: e.target.value })}
              sx={{ width: 220 }}
              placeholder="Complemento"
            />
          </Box>
        </SettingRow>

        <SettingRow label="Bairro">
          <TextField
            size="small"
            value={form.address.neighborhood}
            onChange={(e) => setAddress({ neighborhood: e.target.value })}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Cidade / Estado">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              value={form.address.city}
              onChange={(e) => setAddress({ city: e.target.value })}
              sx={{ width: 260 }}
            />
            <TextField
              size="small"
              value={form.address.state}
              onChange={(e) => setAddress({ state: e.target.value })}
              sx={{ width: 72 }}
              slotProps={{ htmlInput: { maxLength: 2 } }}
            />
          </Box>
        </SettingRow>
      </SettingCard>
      <SettingCard title="Zona de risco" subtitle="Ações irreversíveis. Tenha cuidado." danger>
        <SettingRow
          label="Resetar configurações"
          sublabel="Volta tudo para o padrão. Dados de vendas não são afetados."
        >
          <Button
            variant="outlined"
            color="error"
            sx={{ minWidth: 200 }}
          >
            Resetar
          </Button>
        </SettingRow>

        <SettingRow
          label="Encerrar estabelecimento"
          sublabel="Cancela a assinatura e remove o acesso permanentemente"
        >
          <Button
            variant="contained"
            color="error"
            startIcon={<BlockOutlined />}
            sx={{ minWidth: 200 }}
          >
            Encerrar conta
          </Button>
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
