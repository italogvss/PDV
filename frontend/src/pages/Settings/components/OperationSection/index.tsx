import { useState } from 'react'
import { Box, Switch, TextField, Select, MenuItem, FormControl, Typography } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

interface Shortcut {
  label: string
  keys: string[]
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Nova venda', keys: ['F2'] },
  { label: 'Buscar produto', keys: ['F3'] },
  { label: 'Aplicar desconto', keys: ['F6'] },
  { label: 'Finalizar venda', keys: ['F8'] },
  { label: 'Cancelar item', keys: ['Del'] },
  { label: 'Pagamento Pix', keys: ['⌘', 'P'] },
  { label: 'Pagamento Crédito', keys: ['⌘', 'C'] },
  { label: 'Imprimir cupom', keys: ['⌘', 'I'] },
]

function KeyChip({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'surface.raised',
        border: 1,
        borderColor: 'border.subtle',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 500,
        color: 'text.secondary',
        minWidth: 28,
        textAlign: 'center',
        lineHeight: '20px',
      }}
    >
      {label}
    </Box>
  )
}

export default function OperationSection() {
  const [autoOpen, setAutoOpen] = useState(true)
  const [requireOperator, setRequireOperator] = useState(true)
  const [cashFund, setCashFund] = useState('R$ 200,00')
  const [inactivityLock, setInactivityLock] = useState('5')
  const [allowDiscounts, setAllowDiscounts] = useState(true)
  const [discountLimit, setDiscountLimit] = useState('10%')
  const [requireManagerCancel, setRequireManagerCancel] = useState(false)
  const [barcodeReader, setBarcodeReader] = useState(true)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Caixa e turno" subtitle="Comportamento do ponto de venda">
        <SettingRow label="Abertura automática" sublabel="Abre o caixa ao primeiro login do dia">
          <Switch
            checked={autoOpen}
            onChange={(e) => setAutoOpen(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Solicitar operador" sublabel="Pede confirmação a cada venda">
          <Switch
            checked={requireOperator}
            onChange={(e) => setRequireOperator(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Fundo de caixa" sublabel="Valor inicial sugerido na abertura">
          <TextField
            size="small"
            value={cashFund}
            onChange={(e) => setCashFund(e.target.value)}
            sx={{ width: 160 }}
          />
        </SettingRow>

        <SettingRow label="Bloqueio por inatividade">
          <FormControl size="small" sx={{ width: 200 }}>
            <Select value={inactivityLock} onChange={(e) => setInactivityLock(e.target.value)}>
              <MenuItem value="0">Nunca</MenuItem>
              <MenuItem value="1">Após 1 minuto</MenuItem>
              <MenuItem value="5">Após 5 minutos</MenuItem>
              <MenuItem value="10">Após 10 minutos</MenuItem>
              <MenuItem value="30">Após 30 minutos</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>
      </SettingCard>

      <SettingCard title="Vendas e descontos">
        <SettingRow label="Permitir descontos no PDV">
          <Switch
            checked={allowDiscounts}
            onChange={(e) => setAllowDiscounts(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Limite de desconto sem gerente" sublabel="Acima disso pede liberação">
          <TextField
            size="small"
            value={discountLimit}
            onChange={(e) => setDiscountLimit(e.target.value)}
            sx={{ width: 100 }}
            disabled={!allowDiscounts}
          />
        </SettingRow>

        <SettingRow label="Cancelamento exige gerente">
          <Switch
            checked={requireManagerCancel}
            onChange={(e) => setRequireManagerCancel(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Leitor de código de barras" sublabel="Bipa produtos pelo SKU">
          <Switch
            checked={barcodeReader}
            onChange={(e) => setBarcodeReader(e.target.checked)}
            color="secondary"
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Atalhos de teclado" subtitle="Personalize as combinações no PDV">
        {SHORTCUTS.map((shortcut) => (
          <Box
            key={shortcut.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2,
            }}
          >
            <Typography variant="body2" color="text.primary">
              {shortcut.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {shortcut.keys.map((key) => (
                <KeyChip key={key} label={key} />
              ))}
            </Box>
          </Box>
        ))}
      </SettingCard>
    </Box>
  )
}
