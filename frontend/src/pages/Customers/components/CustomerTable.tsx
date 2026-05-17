import { Card, CardContent, Box, Typography, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import { Customer } from '../../../types/customers.types'
import { formatBRL } from '../../../utils/currency'

interface CustomerTableProps {
  customers: Customer[]
  selectedCustomerId?: string
  onSelectCustomer?: (customerId: string) => void
}

const getSegmentColor = (segment: string) => {
  switch (segment) {
    case 'VIP':
      return 'primary'
    case 'Regular':
      return 'default'
    case 'Novo':
      return 'info'
    case 'Inativo':
      return 'default'
    default:
      return 'default'
  }
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const getAvatarColor = (index: number) => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#06B6D4', // cyan
    '#EC4899', // pink
    '#6366F1', // indigo
  ]
  return colors[index % colors.length]
}

export default function CustomerTable({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'surface.sunken' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Cliente
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Segmento
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Visitas
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Última Compra
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Total Gasto
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Ticket Médio
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer, idx) => (
                <TableRow
                  key={customer.id}
                  onClick={() => onSelectCustomer?.(customer.id)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedCustomerId === customer.id ? 'success.soft' : 'inherit',
                    borderBottom: '1px solid',
                    borderColor: 'border.subtle',
                    '&:hover': { backgroundColor: 'surface.sunken' },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: getAvatarColor(idx),
                          color: 'white',
                        }}
                      >
                        {getInitials(customer.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.tertiary">
                          {customer.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={customer.segment}
                      size="small"
                      variant={customer.segment === 'VIP' ? 'filled' : 'outlined'}
                      color={getSegmentColor(customer.segment)}
                      sx={{
                        ...(customer.segment === 'Regular' && {
                          backgroundColor: 'success.soft',
                          color: 'success.ink',
                          borderColor: 'success.main',
                        }),
                        ...(customer.segment === 'Novo' && {
                          backgroundColor: 'info.soft',
                          color: 'info.ink',
                          borderColor: 'info.main',
                        }),
                        ...(customer.segment === 'Inativo' && {
                          backgroundColor: 'surface.raised',
                          color: 'text.tertiary',
                          borderColor: 'border.subtle',
                        }),
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {customer.visits}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {customer.lastPurchase}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatBRL(customer.totalSpent)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatBRL(customer.averageTicket)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <MoreVertRounded sx={{ fontSize: 18, color: 'text.tertiary' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
