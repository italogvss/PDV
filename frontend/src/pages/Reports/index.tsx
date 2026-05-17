import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
} from '@mui/material'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import { formatBRL } from '../../utils/currency'
import { MOCK_METRICS, MOCK_DAILY_REVENUE, MOCK_ACCUMULATED_PROFIT } from './mock'
import { DateRangeOption } from '../../types/report.types'
import MetricCard from './components/MetricCard'
import RevenueVsExpenseChart from './components/RevenueVsExpenseChart'
import AccumulatedProfitChart from './components/AccumulatedProfitChart'

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 14 dias', days: 14 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Este mês', days: 30 },
]

export default function ReportsPage() {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [selectedDays, setSelectedDays] = useState(14)

  const selectedDateRange = useMemo(
    () => DATE_RANGE_OPTIONS.find((opt) => opt.days === selectedDays) || DATE_RANGE_OPTIONS[1],
    [selectedDays],
  )

  const handleExportPDF = () => {
    // TODO: Implementar exportação em PDF
    console.log('Exportar relatório em PDF')
  }

  const fmtCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h1">Lucros & relatórios</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Análise financeira detalhada
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarMonthOutlined />}
            endIcon={<ArrowDropDownRounded />}
            onClick={(e) => setDateAnchor(e.currentTarget)}
          >
            {selectedDateRange.label}
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<FileDownloadOutlined />}
            onClick={handleExportPDF}
          >
            Exportar PDF
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={dateAnchor}
        open={Boolean(dateAnchor)}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <MenuItem
            key={option.days}
            onClick={() => {
              setSelectedDays(option.days)
              setDateAnchor(null)
            }}
            selected={selectedDays === option.days}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {/* KPIs - Métricas principais */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <MetricCard
          icon={AttachMoneyRounded}
          label="Receita total"
          value={formatBRL(MOCK_METRICS.totalRevenue)}
          trend={MOCK_METRICS.revenueChangePercent}
          trendLabel={`+${MOCK_METRICS.revenueChangePercent}% no período`}
          isPositive={true}
        />
        <MetricCard
          icon={TrendingUpRounded}
          label="Lucro líquido"
          value={formatBRL(MOCK_METRICS.netProfit)}
          trend={MOCK_METRICS.profitMarginPercent}
          trendLabel={`Margem ${MOCK_METRICS.profitMarginPercent}%`}
          isPositive={true}
        />
        <MetricCard
          icon={ShoppingCartRounded}
          label="Custos"
          value={formatBRL(MOCK_METRICS.costs)}
          trend={Math.abs(MOCK_METRICS.costsChangePercent)}
          trendLabel={`${MOCK_METRICS.costsChangePercent}%`}
          isPositive={false}
        />
        <MetricCard
          icon={LocalFireDepartmentRounded}
          label="Ticket médio"
          value={`R$ ${fmtCurrency(MOCK_METRICS.averageTicket)}`}
          trend={MOCK_METRICS.averageTicketChange}
          trendLabel={`+R$ ${fmtCurrency(MOCK_METRICS.averageTicketChange)}`}
          isPositive={true}
        />
      </Box>

      {/* Gráficos */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            lg: '1fr',
          },
        }}
      >
        <RevenueVsExpenseChart data={MOCK_DAILY_REVENUE} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            lg: '1fr',
          },
        }}
      >
        <AccumulatedProfitChart
          data={MOCK_ACCUMULATED_PROFIT}
          trend={MOCK_METRICS.revenueChangePercent}
        />
      </Box>
    </Box>
  )
}
