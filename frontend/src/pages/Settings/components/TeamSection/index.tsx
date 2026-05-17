import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import RemoveIcon from '@mui/icons-material/Remove'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import SettingCard from '../../../../components/SettingCard'

interface Role {
  id: string
  name: string
  description: string
  members: number
}

const ROLES: Role[] = [
  { id: 'owner', name: 'Proprietário', description: 'Acesso total ao sistema, financeiro e fiscal', members: 1 },
  { id: 'manager', name: 'Gerente', description: 'Operação, equipe, relatórios e ajustes diários', members: 1 },
  { id: 'cashier', name: 'Caixa', description: 'PDV, vendas e fechamento de caixa', members: 2 },
  { id: 'attendant', name: 'Atendente', description: 'PDV e consulta de estoque', members: 2 },
  { id: 'stock', name: 'Estoquista', description: 'Cadastro de produtos e movimentações', members: 1 },
]

interface Permission {
  id: string
  label: string
  roles: Record<string, boolean>
}

const PERMISSIONS: Permission[] = [
  {
    id: 'cancel_sales',
    label: 'Cancelar vendas',
    roles: { owner: true, manager: true, cashier: false, attendant: false, stock: false },
  },
  {
    id: 'free_discounts',
    label: 'Aplicar descontos livres',
    roles: { owner: true, manager: true, cashier: false, attendant: false, stock: false },
  },
  {
    id: 'close_cashier',
    label: 'Fechar caixa',
    roles: { owner: true, manager: true, cashier: true, attendant: false, stock: false },
  },
  {
    id: 'view_reports',
    label: 'Ver relatórios',
    roles: { owner: true, manager: true, cashier: false, attendant: false, stock: false },
  },
  {
    id: 'manage_stock',
    label: 'Gerenciar estoque',
    roles: { owner: true, manager: true, cashier: false, attendant: false, stock: true },
  },
  {
    id: 'manage_employees',
    label: 'Gerenciar funcionários',
    roles: { owner: true, manager: false, cashier: false, attendant: false, stock: false },
  },
]

const ROLE_COLUMNS = [
  { id: 'owner', label: 'PROPRIETÁRIO' },
  { id: 'manager', label: 'GERENTE' },
  { id: 'cashier', label: 'CAIXA' },
  { id: 'attendant', label: 'ATENDENTE' },
  { id: 'stock', label: 'ESTOQUISTA' },
]

export default function TeamSection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Papéis disponíveis"
        action={
          <Button variant="contained" color="secondary" size="small" startIcon={<AddIcon />}>
            Novo papel
          </Button>
        }
      >
        {ROLES.map((role) => (
          <Box
            key={role.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'surface.raised',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PeopleAltOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {role.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {role.description}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={`${role.members} ${role.members === 1 ? 'membro' : 'membros'}`}
                size="small"
                sx={{ bgcolor: 'surface.raised', color: 'text.secondary' }}
              />
              <IconButton size="small">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </SettingCard>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Matriz de permissões
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Marque o que cada papel pode fazer
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.sunken' }}>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: 'text.tertiary',
                  letterSpacing: '0.06em',
                  py: 1.5,
                  pl: 4,
                  borderBottom: 1,
                  borderColor: 'border.subtle',
                }}
              >
                PERMISSÃO
              </TableCell>
              {ROLE_COLUMNS.map((col) => (
                <TableCell
                  key={col.id}
                  align="center"
                  sx={{
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'text.tertiary',
                    letterSpacing: '0.06em',
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'border.subtle',
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {PERMISSIONS.map((perm) => (
              <TableRow
                key={perm.id}
                sx={{ '&:last-child td': { border: 0 } }}
              >
                <TableCell
                  sx={{
                    color: 'text.primary',
                    fontSize: 13,
                    py: 2,
                    pl: 4,
                    borderColor: 'border.subtle',
                  }}
                >
                  {perm.label}
                </TableCell>
                {ROLE_COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align="center"
                    sx={{ py: 2, borderColor: 'border.subtle' }}
                  >
                    {perm.roles[col.id] ? (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'success.soft',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'surface.raised',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <RemoveIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      </Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
