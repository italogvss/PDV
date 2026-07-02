import AddRounded from '@mui/icons-material/AddRounded'
import AppsRounded from '@mui/icons-material/AppsRounded'
import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import { Box, Button, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { FEATURES } from '../../constants/entitlements'
import { useEntitlements } from '../../hooks/useSubscription'
import { useAppSelector } from '../../store'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import EmployeeDashboard from './components/EmployeeDashboard'
import EssentialDashboard from './components/EssentialDashboard'

type DashboardView = 'analytics' | 'modules'

const DATE_RANGE_DAYS = [7, 14, 30, 90] as const

export default function DashboardPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<DashboardView>('analytics')
  const [selectedDays, setSelectedDays] = useState(14)
  const name = useAppSelector((state) => state.auth.name) ?? 'Usuário'

  // Feature Pro: painel analítico completo. Sem ela (Essencial), a visão "analítica" vira uma
  // versão enxuta (EssentialDashboard) que não bate nos endpoints de relatório (Pro).
  const { has } = useEntitlements()
  const advancedDashboard = has(FEATURES.advancedDashboard)

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title={`Olá, ${name} 👋`}
        description={`Aqui está o resumo do seu negócio em ${formattedDate}`}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, v: DashboardView | null) => v && setView(v)}
        >
          <ToggleButton value="analytics">
            <InsightsOutlined sx={{ fontSize: 18 }} />
          </ToggleButton>
          <ToggleButton value="modules">
            <AppsRounded sx={{ fontSize: 18 }} />
          </ToggleButton>
        </ToggleButtonGroup>

        {view === 'analytics' && advancedDashboard && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedDays}
            onChange={(_, value) => value !== null && setSelectedDays(value)}
          >
            {DATE_RANGE_DAYS.map((days) => (
              <ToggleButton key={days} value={days}>
                {days} dias
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        <Button variant="contained" startIcon={<AddRounded />} onClick={() => navigate('/vendas')}>
          Nova venda
        </Button>
      </PageHeader>

      {view === 'modules' ? (
        <EmployeeDashboard />
      ) : advancedDashboard ? (
        <AnalyticsDashboard selectedDays={selectedDays} />
      ) : (
        <EssentialDashboard />
      )}
    </Box>
  )
}
