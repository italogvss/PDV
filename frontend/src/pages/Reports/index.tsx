import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Skeleton,
} from '@mui/material'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import { formatBRL } from '../../utils/currency'
import { useSalesMetrics } from '../../hooks/useReports'
import type { DateRangeKey, DateRangeOption } from '../../types/report.types'
import MetricCard from './components/MetricCard'

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: 'Últimos 7 dias', key: '7d' },
  { label: 'Últimos 14 dias', key: '14d' },
  { label: 'Últimos 30 dias', key: '30d' },
  { label: 'Últimos 3 meses', key: '3m' },
  { label: 'Último ano', key: '1y' },
]

export default function ReportsPage() {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [selectedKey, setSelectedKey] = useState<DateRangeKey>('30d')

  const selectedOption = useMemo(
    () => DATE_RANGE_OPTIONS.find((opt) => opt.key === selectedKey) ?? DATE_RANGE_OPTIONS[2],
    [selectedKey],
  )

  const { data: metrics, isLoading } = useSalesMetrics(selectedKey)

  const cancellationRate = useMemo(() => {
    if (!metrics) return null
    const total = metrics.totalSales + metrics.cancelledCount
    if (total === 0) return null
    return ((metrics.cancelledCount / total) * 100).toFixed(1)
  }, [metrics])

  const handleExportPDF = () => {
    // TODO: Implementar exportação em PDF
    console.log('Exportar relatório em PDF')
  }

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
            {selectedOption.label}
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
            key={option.key}
            onClick={() => {
              setSelectedKey(option.key)
              setDateAnchor(null)
            }}
            selected={selectedKey === option.key}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {/* KPIs */}
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
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              icon={AttachMoneyRounded}
              label="Receita total"
              value={formatBRL(metrics?.totalRevenue ?? 0)}
            />
            <MetricCard
              icon={ShoppingCartRounded}
              label="Total de vendas"
              value={String(metrics?.totalSales ?? 0)}
              trendLabel={`${selectedOption.label.toLowerCase()}`}
              isPositive={true}
            />
            <MetricCard
              icon={LocalFireDepartmentRounded}
              label="Ticket médio"
              value={formatBRL(metrics?.averageTicket ?? 0)}
            />
            <MetricCard
              icon={ReceiptLongRounded}
              label="Cancelamentos"
              value={String(metrics?.cancelledCount ?? 0)}
              trendLabel={
                cancellationRate !== null ? `${cancellationRate}% do total` : undefined
              }
              isPositive={false}
            />
          </>
        )}
      </Box>
    </Box>
  )
}
