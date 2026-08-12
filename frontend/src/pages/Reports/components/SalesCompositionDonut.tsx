import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import { basisNote } from './chartHelpers'
import type { FinancialSummaryPoint, ReportBasis } from '../../../types/report.types'

export interface SalesCompositionDonutProps {
  data: FinancialSummaryPoint[]
  basis: ReportBasis
  loading?: boolean
}

export default function SalesCompositionDonut({ data, basis, loading = false }: SalesCompositionDonutProps) {
  const theme = useTheme()

  const totals = data.reduce(
    (acc, d) => ({
      cost: acc.cost + d.cost,
      fees: acc.fees + d.fees,
      expenses: acc.expenses + d.expenses,
      netResult: acc.netResult + d.netResult,
    }),
    { cost: 0, fees: 0, expenses: 0, netResult: 0 },
  )

  const segments = [
    { label: 'Custo', value: totals.cost, color: theme.palette.data.orange.main },
    { label: 'Taxas', value: totals.fees, color: theme.palette.data.purple.main },
    { label: 'Despesas', value: totals.expenses, color: theme.palette.data.red.main },
    { label: 'Lucro líquido', value: totals.netResult, color: theme.palette.success.main },
  ]

  return (
    <DonutChart
      title="Composição do período"
      subtitle="Participação de cada componente na receita total"
      info={`Mesma composição do gráfico ao lado (custo, taxas, despesas e lucro líquido), somada para todo o período e exibida em percentual — não muda com a granularidade das séries, só com o período do calendário. O total do centro é a receita dos itens COM custo cadastrado, não a receita total. ${basisNote(basis)}`}
      segments={segments}
      loading={loading}
      size={180}
    />
  )
}
