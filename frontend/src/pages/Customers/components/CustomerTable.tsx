import {
  Card,
  Box,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import type { Customer } from '../../../types/customers.types'
import CustomerRowMenu from './CustomerRowMenu'

interface CustomerTableProps {
  customers: Customer[]
  selectedCustomerId?: string
  onSelectCustomer?: (customerId: string) => void
  onNavigate: (customer: Customer) => void
  onDelete: (customerId: string) => void
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 500,
  color: 'text.tertiary',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  py: 1.5,
}

export default function CustomerTable({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onNavigate,
  onDelete,
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <Card>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.tertiary">Nenhum cliente encontrado</Typography>
        </Box>
      </Card>
    )
  }

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'surface.sunken' }}>
              <TableCell sx={HEADER_CELL_SX}>Cliente</TableCell>
              <TableCell sx={HEADER_CELL_SX}>E-mail</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Documento</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Localização</TableCell>
              <TableCell align="center" sx={{ ...HEADER_CELL_SX, width: 56 }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => {
              const isSelected = selectedCustomerId === customer.id
              return (
                <TableRow
                  key={customer.id}
                  onClick={() => onSelectCustomer?.(customer.id)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'success.soft' : 'inherit',
                    borderBottom: '1px solid',
                    borderColor: 'border.subtle',
                    '&:last-child td': { borderBottom: 'none' },
                    '&:hover': {
                      backgroundColor: isSelected ? 'success.soft' : 'surface.sunken',
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(customer.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {customer.name}
                        </Typography>
                        {customer.phone && (
                          <Typography variant="caption" color="text.tertiary">
                            {customer.phone}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {customer.email ?? '—'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {customer.document ?? '—'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {customer.address?.city && customer.address?.state
                        ? `${customer.address.city}, ${customer.address.state}`
                        : '—'}
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ py: 1.5 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CustomerRowMenu
                      customer={customer}
                      onNavigate={() => onNavigate(customer)}
                      onDelete={() => onDelete(customer.id)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}
