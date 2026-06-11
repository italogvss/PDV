import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import {
  Box,
  Typography
} from '@mui/material'
import SettingCard from '../../../../components/SettingCard'

// function StatusCard({
//   variant,
//   label,
//   value,
//   detail,
//   warning,
// }: {
//   variant: 'success' | 'neutral' | 'warn'
//   label: string
//   value: string
//   detail: string
//   warning?: string
// }) {
//   const colors = {
//     success: { bg: 'success.soft', labelColor: 'success.ink', border: 'transparent' },
//     neutral: { bg: 'background.paper', labelColor: 'text.tertiary', border: 'border.subtle' },
//     warn: { bg: 'background.paper', labelColor: 'text.tertiary', border: 'border.subtle' },
//   }

//   const c = colors[variant]

//   return (
//     <Box
//       sx={{
//         flex: 1,
//         p: 3,
//         borderRadius: 2,
//         bgcolor: c.bg,
//         border: 1,
//         borderColor: c.border,
//       }}
//     >
//       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
//         {variant === 'success' && (
//           <Box
//             sx={{
//               width: 8,
//               height: 8,
//               borderRadius: '50%',
//               bgcolor: 'success.main',
//               flexShrink: 0,
//             }}
//           />
//         )}
//         <Typography
//           variant="overline"
//           sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: c.labelColor }}
//         >
//           {label}
//         </Typography>
//       </Box>
//       <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700, mb: 0.5 }}>
//         {value}
//       </Typography>
//       <Typography variant="caption" color="text.secondary">
//         {detail}
//       </Typography>
//       {warning && (
//         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
//           <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: 'warning.main' }} />
//           <Typography variant="caption" color="warning.main" sx={{ fontWeight: 500 }}>
//             {warning}
//           </Typography>
//         </Box>
//       )}
//     </Box>
//   )
// }

export default function FiscalSection() {


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Implementação Futura" subtitle="Está pagina esta em construção e ficara disponível em breve.">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, height: 500 }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.disabled">
            Esta seção estará disponível em breve
          </Typography>
        </Box>
      </SettingCard>
      {/* <SettingCard title="Status SEFAZ" subtitle="Conexão com a Secretaria da Fazenda">
        <Box sx={{ display: 'flex', gap: 2, p: 3 }}>
          <StatusCard
            variant="success"
            label="OPERANDO"
            value="Ambiente Produção"
            detail="Latência média: 320ms"
          />
          <StatusCard
            variant="neutral"
            label="EMITIDAS NO MÊS"
            value="1.284"
            detail="3 rejeitadas • 0 pendentes"
          />
          <StatusCard
            variant="warn"
            label="CERTIFICADO A1"
            value="Válido até 24/11/2026"
            detail="Expira em 192 dias"
            warning="Renovar em 192 dias"
          />
        </Box>
      </SettingCard>

      <SettingCard title="Emissão de NFC-e">
        <SettingRow label="Regime tributário">
          <FormControl size="small" sx={{ width: 240 }}>
            <Select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)}>
              <MenuItem value="simples">Simples Nacional</MenuItem>
              <MenuItem value="presumido">Lucro Presumido</MenuItem>
              <MenuItem value="real">Lucro Real</MenuItem>
              <MenuItem value="mei">MEI</MenuItem>
            </Select>
          </FormControl>
        </SettingRow>

        <SettingRow label="CFOP padrão" sublabel="Vendas dentro do estado">
          <TextField
            size="small"
            value={cfop}
            onChange={(e) => setCfop(e.target.value)}
            sx={{ width: 120 }}
            inputProps={{ maxLength: 4 }}
          />
        </SettingRow>

        <SettingRow label="CSOSN padrão">
          <TextField
            size="small"
            value={csosn}
            onChange={(e) => setCsosn(e.target.value)}
            sx={{ width: 120 }}
            inputProps={{ maxLength: 4 }}
          />
        </SettingRow>

        <SettingRow label="Série / próximo número">
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              sx={{ width: 80 }}
              inputProps={{ maxLength: 3 }}
            />
            <TextField
              size="small"
              value={nextNumber}
              onChange={(e) => setNextNumber(e.target.value)}
              sx={{ width: 160 }}
            />
          </Box>
        </SettingRow>

        <SettingRow label="Emissão automática" sublabel="Emite a NFC-e ao finalizar cada venda">
          <Switch
            checked={autoEmit}
            onChange={(e) => setAutoEmit(e.target.checked)}
            color="secondary"
          />
        </SettingRow>

        <SettingRow label="Contingência off-line" sublabel="Usa DANFE simplificado sem internet">
          <Switch
            checked={offlineContingency}
            onChange={(e) => setOfflineContingency(e.target.checked)}
            color="secondary"
          />
        </SettingRow>
      </SettingCard> */}
    </Box>
  )
}
