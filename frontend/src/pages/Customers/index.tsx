import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  InputBase,
  CircularProgress,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import PeopleOutlineRounded from '@mui/icons-material/PeopleOutlineRounded'
import PhoneAndroidOutlined from '@mui/icons-material/PhoneAndroidOutlined'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers'
import type { Customer } from '../../types/customers.types'
import CustomerMetricCard from './components/CustomerMetricCard'
import CustomerTable from './components/CustomerTable'
import CustomerDetailPanel from './components/CustomerDetailPanel'
import AddCustomerModal from './components/AddCustomerModal'
import EditCustomerModal from './components/EditCustomerModal'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>()
  const [addOpen, setAddOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useCustomers(1, 200)
  const deleteCustomer = useDeleteCustomer()

  const customers = data?.data ?? []

  const kpis = useMemo(
    () => ({
      total: customers.length,
      withPhone: customers.filter((c) => c.phone).length,
      withEmail: customers.filter((c) => c.email).length,
      withDocument: customers.filter((c) => c.document).length,
    }),
    [customers],
  )

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(search) ?? false) ||
        (c.document?.includes(search) ?? false),
    )
  }, [customers, search])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  const handleDelete = async (customerId: string) => {
    await deleteCustomer.mutateAsync(customerId)
    if (selectedCustomerId === customerId) setSelectedCustomerId(undefined)
  }

  const handleEditOpen = (customer: Customer) => {
    setEditCustomer(customer)
  }

  const handleEditClose = () => {
    setEditCustomer(null)
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
          <Typography variant="h1">Clientes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {kpis.total} cadastrados • CRM e fidelidade
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<AddRounded />}
          onClick={() => setAddOpen(true)}
          sx={{ mt: 0.5 }}
        >
          Novo cliente
        </Button>
      </Box>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <CustomerMetricCard
          icon={PeopleOutlineRounded}
          label="Total de clientes"
          value={kpis.total}
          trend={`${kpis.total} cadastrados`}
        />
{/*         
        <CustomerMetricCard
          icon={PhoneAndroidOutlined}
          label="Com telefone"
          value={kpis.withPhone}
          trend="disponíveis para WhatsApp"
        />
        <CustomerMetricCard
          icon={EmailOutlined}
          label="Com e-mail"
          value={kpis.withEmail}
          trend="para contato"
        />
        <CustomerMetricCard
          icon={BadgeOutlined}
          label="Com documento"
          value={kpis.withDocument}
          trend="CPF / CNPJ"
        /> */}
      </Box>

      {/* Busca */}
      <Card>
        <CardContent sx={{ py: '10px !important', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SearchOutlined sx={{ fontSize: 18, color: 'text.tertiary', flexShrink: 0 }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, e-mail, telefone ou documento..."
              sx={{ flex: 1, fontSize: 14 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Tabela + Painel de detalhe */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              xl: selectedCustomer ? '2fr 1fr' : '1fr',
            },
            alignItems: 'start',
          }}
        >
          <CustomerTable
            customers={filteredCustomers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onEdit={handleEditOpen}
            onDelete={handleDelete}
          />
          {selectedCustomer && (
            <CustomerDetailPanel
              customer={selectedCustomer}
              onEdit={handleEditOpen}
              onDelete={handleDelete}
            />
          )}
        </Box>
      )}

      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} />

      {editCustomer && (
        <EditCustomerModal
          open
          customer={editCustomer}
          onClose={handleEditClose}
        />
      )}
    </Box>
  )
}
