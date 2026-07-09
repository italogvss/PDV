import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import { Box, Button, Menu, MenuItem } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import UpsellCard from '../../components/UpsellCard'
import { FEATURES } from '../../constants/entitlements'
import { useEntitlements } from '../../hooks/useSubscription'
import type { ExpenseBasis, GroupBy, RangePreset } from '../../types/report.types'
import ReportsContent from './components/ReportsContent'

// Janelas móveis a partir de hoje (sem snap pro início do mês).
const RANGE_PRESETS: RangePreset[] = [
  { label: 'Últimos 7 dias', key: '7d', amount: 7, unit: 'day' },
  { label: 'Últimos 30 dias', key: '30d', amount: 30, unit: 'day' },
  { label: 'Últimos 3 meses', key: '3m', amount: 3, unit: 'month' },
  { label: 'Últimos 6 meses', key: '6m', amount: 6, unit: 'month' },
  { label: 'Últimos 12 meses', key: '12m', amount: 12, unit: 'month' },
]

function suggestGroupBy(daysSpan: number): GroupBy {
  if (daysSpan <= 31) return 'day'
  if (daysSpan <= 92) return 'week'
  return 'month'
}

const REPORT_HIGHLIGHTS = [
  'Relatórios de vendas: receita, produtos e pagamentos',
  'Relatórios de funcionários: desempenho e ranking por operador',
  'Relatórios de agendamentos e serviços: ocupação e horários de pico',
  'Relatórios de clientes: ranking e histórico de compras',
]

export default function ReportsPage() {
  const { has } = useEntitlements()
  const advancedReports = has(FEATURES.advancedReports)

  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [start, setStart] = useState<Dayjs>(dayjs().subtract(29, 'day'))
  const [end, setEnd] = useState<Dayjs>(dayjs())
  const [selectedPreset, setSelectedPreset] = useState<string | null>('30d')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [expenseBasis, setExpenseBasis] = useState<ExpenseBasis>('accrual')

  const startDate = start.format('YYYY-MM-DD')
  const endDate = end.format('YYYY-MM-DD')

  const daysSpan = useMemo(
    () => end.startOf('day').diff(start.startOf('day'), 'day') + 1,
    [start, end],
  )

  // Período anterior equivalente: mesma duração, deslocado para trás
  const prevEnd = useMemo(() => start.subtract(1, 'day'), [start])
  const prevStart = useMemo(() => prevEnd.subtract(daysSpan - 1, 'day'), [prevEnd, daysSpan])
  const prevStartDate = prevStart.format('YYYY-MM-DD')
  const prevEndDate = prevEnd.format('YYYY-MM-DD')

  // Ao trocar o período, reajusta a granularidade para uma escala adequada.
  // Alternar o toggle manualmente não mexe no span, então a escolha do usuário persiste.
  useEffect(() => {
    setGroupBy(suggestGroupBy(daysSpan))
  }, [daysSpan])

  const presetLabel = useMemo(
    () => RANGE_PRESETS.find((p) => p.key === selectedPreset)?.label ?? 'Personalizado',
    [selectedPreset],
  )

  const handlePresetSelect = (preset: RangePreset) => {
    // Para dias, descontamos N-1 (a janela inclui hoje) → exatamente N dias.
    const back = preset.unit === 'day' ? preset.amount - 1 : preset.amount
    setStart(dayjs().subtract(back, preset.unit))
    setEnd(dayjs())
    setSelectedPreset(preset.key)
    setDateAnchor(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Lucros & relatórios" description="Análise financeira detalhada">
        {advancedReports && (
          <>
            <Button
              variant="outlined"
              startIcon={<CalendarMonthOutlined />}
              endIcon={<ArrowDropDownRounded />}
              onClick={(e) => setDateAnchor(e.currentTarget)}
            >
              {presetLabel}
            </Button>
            <DatePicker
              label="De"
              format="DD/MM/YYYY"
              value={start}
              maxDate={end}
              onChange={(val) => {
                if (val) {
                  setStart(val)
                  setSelectedPreset(null)
                }
              }}
              slotProps={{ textField: { sx: { width: 180 } } }}
            />
            <DatePicker
              label="Até"
              format="DD/MM/YYYY"
              value={end}
              minDate={start}
              maxDate={dayjs()}
              onChange={(val) => {
                if (val) {
                  setEnd(val)
                  setSelectedPreset(null)
                }
              }}
              slotProps={{ textField: { sx: { width: 180 } } }}
            />
          </>
        )}
      </PageHeader>

      {advancedReports && (
        <Menu
          anchorEl={dateAnchor}
          open={Boolean(dateAnchor)}
          onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {RANGE_PRESETS.map((preset) => (
            <MenuItem
              key={preset.key}
              onClick={() => handlePresetSelect(preset)}
              selected={selectedPreset === preset.key}
            >
              {preset.label}
            </MenuItem>
          ))}
        </Menu>
      )}

      {advancedReports ? (
        <ReportsContent
          startDate={startDate}
          endDate={endDate}
          prevStartDate={prevStartDate}
          prevEndDate={prevEndDate}
          daysSpan={daysSpan}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          expenseBasis={expenseBasis}
          onExpenseBasisChange={setExpenseBasis}
        />
      ) : (
        <UpsellCard
          title="Relatórios avançados são exclusivos do plano Pro"
          description="Desbloqueie análises completas de vendas, equipe, agendamentos e clientes com o plano Pro."
          highlights={REPORT_HIGHLIGHTS}
        />
      )}
    </Box>
  )
}
