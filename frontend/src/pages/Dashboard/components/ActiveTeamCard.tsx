import { Avatar, AvatarGroup, Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees } from '../../../hooks/useEmployees'
import { useSales } from '../../../hooks/useSales'
import QuickActionCard from './QuickActionCard'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ActiveTeamCard() {
  const navigate = useNavigate()
  const { data: employeesPage, isLoading } = useEmployees()
  const { data: sales } = useSales()

  const salesTodayByOperator = useMemo(() => {
    const today = dayjs().startOf('day')
    const map = new Map<string, number>()
    for (const sale of sales ?? []) {
      if (sale.status !== 'Active' || !sale.operatorId) continue
      if (!dayjs(sale.createdAt).isSame(today, 'day')) continue
      map.set(sale.operatorId, (map.get(sale.operatorId) ?? 0) + 1)
    }
    return map
  }, [sales])

  const team = useMemo(() => {
    const employees = (employeesPage?.data ?? []).filter((employee) => employee.isActive)
    return employees
      .map((employee) => ({
        employee,
        salesToday: (employee.userId && salesTodayByOperator.get(employee.userId)) || 0,
      }))
      .sort((a, b) => b.salesToday - a.salesToday)
  }, [employeesPage, salesTodayByOperator])

  const top = team.slice(0, 3)

  return (
    <QuickActionCard
      title="Equipe ativa"
      headerExtra={
        top.length > 0 ? (
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
            {top.map(({ employee }) => (
              <Avatar key={employee.id} src={employee.avatarUrl}>
                {initials(employee.name)}
              </Avatar>
            ))}
          </AvatarGroup>
        ) : undefined
      }
      footerLabel="Ver equipe"
      onFooter={() => navigate('/funcionarios')}
      loading={isLoading}
      isEmpty={top.length === 0}
      emptyText="Nenhum funcionário ativo."
    >
      {top.map(({ employee, salesToday }) => (
        <Box key={employee.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={employee.avatarUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>
            {initials(employee.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {employee.name}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              {employee.roleName} • {salesToday} vendas hoje
            </Typography>
          </Box>
        </Box>
      ))}
    </QuickActionCard>
  )
}
