import { useState, useMemo } from 'react'
import { Box, Typography, Button, InputBase, Chip, Stack } from '@mui/material'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import { formatBRL } from '../../utils/currency'
import { MOCK_CUSTOMER_METRICS, MOCK_CUSTOMERS } from './mock'
import { CustomerSegment } from '../../types/customers.types'
import CustomerMetricCard from './components/CustomerMetricCard'
import CustomerTable from './components/CustomerTable'
import CustomerDetailPanel from './components/CustomerDetailPanel'

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(MOCK_CUSTOMERS[1]?.id)

  const filteredCustomers = useMemo(() => {
    return MOCK_CUSTOMERS.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)

      const matchesSegment = selectedSegment === 'all' || customer.segment === selectedSegment

      return matchesSearch && matchesSegment
    })
  }, [searchTerm, selectedSegment])

  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === selectedCustomerId)

  const segmentCounts = {
    all: MOCK_CUSTOMERS.length,
    VIP: MOCK_CUSTOMERS.filter((c) => c.segment === 'VIP').length,
    Regular: MOCK_CUSTOMERS.filter((c) => c.segment === 'Regular').length,
    Novo: MOCK_CUSTOMERS.filter((c) => c.segment === 'Novo').length,
    Inativo: MOCK_CUSTOMERS.filter((c) => c.segment === 'Inativo').length,
  }

  const segmentFilters = [
    { label: 'Todos', value: 'all' as const, count: segmentCounts.all },
    { label: 'VIP', value: 'VIP' as const, count: segmentCounts.VIP },
    { label: 'Regulares', value: 'Regular' as const, count: segmentCounts.Regular },
    { label: 'Novos', value: 'Novo' as const, count: segmentCounts.Novo },
    { label: 'Inativos', value: 'Inativo' as const, count: segmentCounts.Inativo },
  ]

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
          <Typography variant="h1">Clientes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {MOCK_CUSTOMER_METRICS.totalCustomers} cadastrados • CRM e fidelidade
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadOutlined />}
          >
            Importar CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
          >
            Exportar
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SendOutlined />}
          >
            Campanha
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
          >
            Novo cliente
          </Button>
        </Box>
      </Box>

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
        <CustomerMetricCard
          icon={PersonOutlined}
          label="Total de clientes"
          value={MOCK_CUSTOMER_METRICS.totalCustomers}
          trend={`+${MOCK_CUSTOMER_METRICS.newCustomersThisMonth} no mês`}
        />
        <CustomerMetricCard
          icon={CheckCircleOutlined}
          label="Ativos"
          value={MOCK_CUSTOMER_METRICS.activeCustomers}
          trend={`${MOCK_CUSTOMER_METRICS.activePercentage}% da base`}
        />
        <CustomerMetricCard
          icon={TrendingUpOutlined}
          label="Novos no mês"
          value={MOCK_CUSTOMER_METRICS.newCustomersThisMonth}
          trend="Maio/2026"
        />
        <CustomerMetricCard
          icon={LocalFireDepartmentRounded}
          label="LTV médio"
          value={formatBRL(MOCK_CUSTOMER_METRICS.averageLTV)}
          trend={`${MOCK_CUSTOMER_METRICS.vipCount} clientes VIP`}
        />
      </Box>

      {/* Filtros e Busca */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Busca */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2,
            border: 1,
            borderColor: 'border.subtle',
            bgcolor: 'background.paper',
            '&:focus-within': { borderColor: 'border.strong' },
          }}
        >
          <SearchOutlined sx={{ fontSize: 18, color: 'text.tertiary' }} />
          <InputBase
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nome, e-mail ou telefone..."
            sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}
          />
        </Box>

        {/* Filtros por segmento */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={1}>
            {segmentFilters.map((filter) => (
              <Chip
                key={filter.value}
                label={`${filter.label} ${filter.count}`}
                onClick={() => setSelectedSegment(filter.value)}
                variant={selectedSegment === filter.value ? 'filled' : 'outlined'}
                color={selectedSegment === filter.value ? 'primary' : 'default'}
                sx={{
                  ...(selectedSegment === filter.value && {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    fontWeight: 600,
                  }),
                  ...(selectedSegment !== filter.value &&
                    filter.value === 'all' && {
                      backgroundColor: 'common.black',
                      color: 'white',
                      borderColor: 'common.black',
                      fontWeight: 600,
                    }),
                }}
              />
            ))}
          </Stack>

          {/* Divider and other options */}
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1}>
            {['Ordenar', 'Maior gasto', 'Mais visitas', 'Recentes', 'A-Z'].map((option) => (
              <Typography
                key={option}
                variant="caption"
                sx={{
                  cursor: 'pointer',
                  color: 'text.secondary',
                  fontWeight: 500,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'surface.raised' },
                }}
              >
                {option}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Tabela e Detalhe lado a lado */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            xl: '2fr 1fr',
          },
          alignItems: 'start',
        }}
      >
        <CustomerTable
          customers={filteredCustomers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
        />
        <CustomerDetailPanel customer={selectedCustomer} />
      </Box>
    </Box>
  )
}
