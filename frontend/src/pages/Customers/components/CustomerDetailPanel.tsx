import { Card, CardContent, Box, Typography, Avatar, Chip, TextField, Divider, IconButton } from '@mui/material'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded'
import { Customer } from '../../../types/customers.types'
import { formatBRL } from '../../../utils/currency'

interface CustomerDetailPanelProps {
  customer?: Customer
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const getAvatarColor = (name: string) => {
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function CustomerDetailPanel({ customer }: CustomerDetailPanelProps) {
  if (!customer) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.tertiary">Selecione um cliente para ver detalhes</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  fontSize: 18,
                  fontWeight: 600,
                  backgroundColor: getAvatarColor(customer.name),
                  color: 'white',
                }}
              >
                {getInitials(customer.name)}
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 600 }}>
                  {customer.name}
                </Typography>
                <Typography variant="caption" color="text.tertiary">
                  Cliente desde {customer.joinedDate}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {customer.isVIP && (
                    <Chip
                      label="VIP"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: 'primary.main',
                        color: 'white',
                      }}
                    />
                  )}
                  {customer.segment === 'Novo' && (
                    <Chip
                      label="NOVO"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: 'info.main',
                        color: 'white',
                      }}
                    />
                  )}
                  <Chip
                    icon={<span>💳</span>}
                    label="Pix"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: 'surface.raised',
                      color: 'text.primary',
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <IconButton size="small">
              <MoreVertRounded sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              TOTAL GASTO
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
              {formatBRL(customer.totalSpent)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              VISITAS
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 600 }}>
              {customer.visits}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Additional Info */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              TICKET MÉDIO
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {formatBRL(customer.averageTicket)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              ÚLTIMA COMPRA
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {customer.lastPurchase}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Contact Info */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Telefone
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {customer.phone}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                E-mail
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                {customer.email}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Cidade
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {customer.city}
            </Typography>
          </Box>
          {customer.favoriteItem && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Item favorito
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {customer.favoriteItem}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StarOutlineRounded sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
                Nota
              </Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              defaultValue={customer.notes}
              placeholder="Adicione uma nota..."
              size="small"
            />
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
