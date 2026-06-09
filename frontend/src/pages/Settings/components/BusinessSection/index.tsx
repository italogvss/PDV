import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  CircularProgress,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import SearchIcon from '@mui/icons-material/Search'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { BlockOutlined, DeleteOutlined } from '@mui/icons-material'
import { useTenantSettings, useUpdateBusinessSettings } from '../../../../hooks/useTenantSettings'
import type { BusinessAddress, BusinessSettings } from '../../../../types/settings.types'

export default function BusinessSection() {
  const { data, isLoading } = useTenantSettings()
  const update = useUpdateBusinessSettings()
  const [form, setForm] = useState<BusinessSettings | null>(null)

  useEffect(() => {
    if (data) setForm(data.business)
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

  const hasChanges = JSON.stringify(form) !== JSON.stringify(data?.business)

  const handleSave = () => update.mutate(form)
  const handleCancel = () => data && setForm(data.business)

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
        <SettingRow label="Logo" sublabel="PNG ou SVG até 1MB" alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'text.primary',
                color: 'background.paper',
                fontWeight: 700,
                fontSize: 20,
                borderRadius: 2,
              }}
            >
              {form.fantasyName.charAt(0).toUpperCase() || 'Z'}
            </Avatar>
            <Button variant="outlined" size="small" startIcon={<FileUploadOutlinedIcon />}>
              Alterar
            </Button>
            <Button variant="outlined" size="small" startIcon={<DeleteOutlined />} color="inherit">
              Remover
            </Button>
          </Box>
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
              onChange={(e) => set({ cnpj: e.target.value })}
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
            onChange={(e) => set({ phone: e.target.value })}
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
              onChange={(e) => setAddress({ cep: e.target.value })}
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
          label="Apagar todos os dados de teste"
          sublabel="Remove vendas, clientes e produtos marcados como teste"
        >
          <Button
            variant="outlined"
            color="error"
            sx={{ minWidth: 200 }}
          >
            Apagar
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
