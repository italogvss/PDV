import { useState } from 'react'
import {
  Box,
  Typography,
  Switch,
  Button,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  TextField,
} from '@mui/material'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'

interface Printer {
  id: string
  name: string
  port: string
  isDefault: boolean
  status: 'online' | 'offline'
}

const PRINTERS: Printer[] = [
  { id: '1', name: 'Epson TM-T20X', port: 'USB001', isDefault: true, status: 'online' },
  { id: '2', name: 'Bematech MP-4200 TH', port: '192.168.1.42:9100', isDefault: false, status: 'offline' },
]

export default function PrintingSection() {
  const [paperWidth, setPaperWidth] = useState('80')
  const [autoPrint, setAutoPrint] = useState(true)
  const [includeLogo, setIncludeLogo] = useState(true)
  const [printCopy, setPrintCopy] = useState(false)
  const [qrCode, setQrCode] = useState(true)
  const [footerMessage, setFooterMessage] = useState('Obrigado pela preferência! Volte sempre.')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Impressoras"
        subtitle="Conectadas via USB ou rede"
        action={
          <Button variant="contained" color="secondary" size="small" startIcon={<AddIcon />}>
            Adicionar
          </Button>
        }
      >
        {PRINTERS.map((printer) => (
          <Box
            key={printer.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'surface.raised',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PrintOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                    {printer.name}
                  </Typography>
                  {printer.isDefault && (
                    <Chip
                      label="Padrão"
                      size="small"
                      sx={{ bgcolor: 'surface.raised', color: 'text.secondary', fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Porta: {printer.port}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={printer.status === 'online' ? 'Conectada' : 'Off-line'}
                size="small"
                sx={
                  printer.status === 'online'
                    ? { bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }
                    : { bgcolor: 'error.soft', color: 'error.ink', fontWeight: 600 }
                }
              />
              <Button variant="outlined" size="small">
                Teste
              </Button>
              <IconButton size="small">
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </SettingCard>

      <SettingCard title="Cupom de venda">
        <SettingRow label="Largura do papel">
          <FormControl size="small" sx={{ width: 160 }}>
            <Select value={paperWidth} onChange={(e) => setPaperWidth(e.target.value)}>
              <MenuItem value="58">58 mm</MenuItem>
              <MenuItem value="80">80 mm</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="Imprimir automaticamente" sublabel="Ao finalizar cada venda">
          <Switch
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Incluir logo no topo">
          <Switch
            checked={includeLogo}
            onChange={(e) => setIncludeLogo(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Imprimir 2ª via" sublabel="Cópia para o caixa">
          <Switch
            checked={printCopy}
            onChange={(e) => setPrintCopy(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="QR Code da NFC-e">
          <Switch
            checked={qrCode}
            onChange={(e) => setQrCode(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Mensagem de rodapé" sublabel="Aparece no fim de cada cupom">
          <TextField
            size="small"
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            sx={{ width: 340 }}
          />
        </SettingRow>
      </SettingCard>
    </Box>
  )
}
