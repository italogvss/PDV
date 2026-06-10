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

const toggleSx = {
  borderRadius: '20px !important',
  fontSize: 12,
  px: 2,
  py: 0.5,
  textTransform: 'none',
  fontWeight: 500,
  color: 'text.secondary',
  '&.Mui-selected': {
    border: 'none',
    bgcolor: 'action.selected',
    color: 'text.primary',
    fontWeight: 600,
  },
} as const

export default function FiltersPopover({
  anchorEl,
  sections,
  onClose,
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
        {sections.map((section) => (
          <Box key={section.id}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}
            >
              {section.label}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={section.value}
              onChange={(_, v) => v && section.onChange(v)}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {section.options.map((opt) => (
                <ToggleButton key={opt} value={opt} sx={toggleSx}>
                  {opt}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        ))}

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
