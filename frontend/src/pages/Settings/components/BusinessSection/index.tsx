import { useState } from 'react'
import {
  Box,
  Button,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  InputAdornment,
  Grid,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

export default function BusinessSection() {
  const [fantasyName, setFantasyName] = useState('Café da Esquina')
  const [companyName, setCompanyName] = useState('Café da Esquina Comércio de Alimentos Ltda.')
  const [cnpj, setCnpj] = useState('12.345.678/0001-90')
  const [stateRegistration, setStateRegistration] = useState('123.456.789.110')
  const [segment, setSegment] = useState('cafeteria')
  const [phone, setPhone] = useState('(11) 3344-5566')
  const [cep, setCep] = useState('01310-100')
  const [street, setStreet] = useState('Rua das Flores')
  const [number, setNumber] = useState('123')
  const [complement, setComplement] = useState('Sala 1')
  const [neighborhood, setNeighborhood] = useState('Bela Vista')
  const [city, setCity] = useState('São Paulo')
  const [state, setState] = useState('SP')
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setHasChanges(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Dados do estabelecimento"
        subtitle="Aparece em recibos, faturas e relatórios"
        action={
          hasChanges ? (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={() => setHasChanges(false)}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={<CheckIcon />}
                onClick={() => setHasChanges(false)}
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
              Z
            </Avatar>
            <Button variant="outlined" size="small" startIcon={<FileUploadOutlinedIcon />}>
              Alterar
            </Button>
            <Button variant="outlined" size="small" startIcon={<DeleteOutlineIcon />} color="inherit">
              Remover
            </Button>
          </Box>
        </SettingRow>

        <SettingRow label="Nome fantasia">
          <TextField
            size="small"
            value={fantasyName}
            onChange={handleChange(setFantasyName)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Razão social">
          <TextField
            size="small"
            value={companyName}
            onChange={handleChange(setCompanyName)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="CNPJ" sublabel="Usado em emissão fiscal">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={cnpj}
              onChange={handleChange(setCnpj)}
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
            value={stateRegistration}
            onChange={handleChange(setStateRegistration)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Segmento">
          <FormControl size="small" sx={{ width: 340 }}>
            <Select
              value={segment}
              onChange={(e) => { setSegment(e.target.value); setHasChanges(true) }}
            >
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
            value={phone}
            onChange={handleChange(setPhone)}
            sx={{ width: 340 }}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Endereço">
        <SettingRow label="CEP">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              value={cep}
              onChange={handleChange(setCep)}
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
            value={street}
            onChange={handleChange(setStreet)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Número / Complemento">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              value={number}
              onChange={handleChange(setNumber)}
              sx={{ width: 100 }}
              placeholder="Nº"
            />
            <TextField
              size="small"
              value={complement}
              onChange={handleChange(setComplement)}
              sx={{ width: 220 }}
              placeholder="Complemento"
            />
          </Box>
        </SettingRow>

        <SettingRow label="Bairro">
          <TextField
            size="small"
            value={neighborhood}
            onChange={handleChange(setNeighborhood)}
            sx={{ width: 340 }}
          />
        </SettingRow>

        <SettingRow label="Cidade / Estado">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              value={city}
              onChange={handleChange(setCity)}
              sx={{ width: 260 }}
            />
            <TextField
              size="small"
              value={state}
              onChange={handleChange(setState)}
              sx={{ width: 72 }}
              inputProps={{ maxLength: 2 }}
            />
          </Box>
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
