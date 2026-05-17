import { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import type { FilterMenuProps } from './types'

export default function FilterMenu({
  label,
  options,
  selected,
  onChange,
}: FilterMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const toggleOption = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option],
    )
  }

  const displayLabel =
    selected.length > 0 ? `${label} (${selected.length})` : label

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<FilterListRounded />}
        onClick={(e) => setAnchor(e.currentTarget)}
        color={selected.length > 0 ? 'primary' : 'primary'}
        sx={
          selected.length > 0
            ? { borderColor: 'secondary.main', color: 'text.primary' }
            : undefined
        }
      >
        {displayLabel}
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            onClick={() => toggleOption(option)}
            sx={{ gap: 0.5, py: 0.75 }}
          >
            <Checkbox
              size="small"
              checked={selected.includes(option)}
              sx={{ p: 0, mr: 0.5 }}
            />
            <ListItemText
              primary={option}
              primaryTypographyProps={{ fontSize: 13 }}
            />
          </MenuItem>
        ))}

        {selected.length > 0 && [
          <Divider key="div" sx={{ my: 0.5 }} />,
          <MenuItem
            key="clear"
            onClick={() => {
              onChange([])
              setAnchor(null)
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Limpar filtro
            </Typography>
          </MenuItem>,
        ]}
      </Menu>
    </>
  )
}
