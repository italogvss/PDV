import {
  Popover,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Divider,
} from '@mui/material'
import FilterListOffRounded from '@mui/icons-material/FilterListOffRounded'
import type { FiltersPopoverProps } from './types'
import type { SaleStatus, SalePaymentMethod } from '../../types'

const STATUSES: Array<SaleStatus | 'Todos'> = ['Todos', 'Ativo', 'Cancelado']
const PAYMENTS: Array<SalePaymentMethod | 'Todos'> = ['Todos', 'Pix', 'Dinheiro', 'Crédito', 'Débito']

const toggleSx = {
  borderRadius: '20px !important',
  border: '1px solid !important',
  borderColor: 'divider !important',
  fontSize: 12,
  px: 1.5,
  py: 0.5,
  textTransform: 'none',
  fontWeight: 500,
  color: 'text.secondary',
  '&.Mui-selected': {
    bgcolor: 'action.selected',
    color: 'text.primary',
    fontWeight: 600,
  },
} as const

export default function FiltersPopover({
  anchorEl,
  filters,
  operators,
  onClose,
  onChange,
  onClear,
}: FiltersPopoverProps) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            p: 3,
            width: 340,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 4,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            Status
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={filters.status}
            onChange={(_, v) => v && onChange({ ...filters, status: v })}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {STATUSES.map((s) => (
              <ToggleButton key={s} value={s} sx={toggleSx}>
                {s}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            Forma de pagamento
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={filters.payment}
            onChange={(_, v) => v && onChange({ ...filters, payment: v })}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {PAYMENTS.map((p) => (
              <ToggleButton key={p} value={p} sx={toggleSx}>
                {p}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            Operador
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={filters.operator}
            onChange={(_, v) => v && onChange({ ...filters, operator: v })}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {['Todos', ...operators].map((op) => (
              <ToggleButton key={op} value={op} sx={toggleSx}>
                {op}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <Button
          variant="ghost"
          size="small"
          startIcon={<FilterListOffRounded />}
          onClick={onClear}
          sx={{ alignSelf: 'flex-start' }}
        >
          Limpar filtros
        </Button>
      </Box>
    </Popover>
  )
}
