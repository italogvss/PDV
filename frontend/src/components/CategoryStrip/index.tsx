import { useState } from 'react'
import {
  Box,
  Chip,
  Skeleton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material'
import EditRounded from '@mui/icons-material/EditRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import type { Category, CategoryStripProps } from './types'

export default function CategoryStrip({
  categories,
  countByCategory,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: CategoryStripProps) {
  if (isLoading) {
    return (
      <Box>
        <StripLabel />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={100} height={36} sx={{ borderRadius: '999px' }} />
          ))}
        </Box>
      </Box>
    )
  }

  if (categories.length === 0) {
    return (
      <Box>
        <StripLabel />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2.5 }}>
          <Typography variant="body2" color="text.disabled">
            Nenhuma categoria cadastrada ainda
          </Typography>
          <Chip
            label="+ Criar categoria"
            variant="outlined"
            size="large"
            onClick={onAdd}
            sx={{ cursor: 'pointer', borderStyle: 'dashed', borderColor: 'success.main', color: 'success.main' }}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <StripLabel />
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          flexWrap: 'nowrap',
          pb: 3,
          '&::-webkit-scrollbar': { height: 3 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'border.subtle', borderRadius: '999px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        }}
      >
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            count={countByCategory[cat.name] ?? 0}
            onEdit={() => onEdit(cat)}
            onDelete={() => onDelete(cat.id)}
          />
        ))}

        <Chip
          label="+ Criar categoria"
          variant="outlined"
          onClick={onAdd}
          sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed', borderColor: 'success.main', color: 'success.main', height: 36, fontSize: 14, px: 0.5 }}
        />
      </Box>
    </Box>
  )
}

function StripLabel() {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        color: 'text.disabled',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        display: 'block',
        mb: 1.5,
      }}
    >
      Categorias
    </Typography>
  )
}

interface CategoryChipProps {
  category: Category
  count: number
  onEdit: () => void
  onDelete: () => void
}

function CategoryChip({ category, count, onEdit, onDelete }: CategoryChipProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  return (
    <Box sx={{ flexShrink: 0 }}>
      <Chip
        label={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: category.color, flexShrink: 0 }}
            />
            <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
              {category.name}
            </Typography>
            <Typography component="span" variant="body2" sx={{ opacity: 0.45, fontWeight: 400 }}>
              {count}
            </Typography>
          </Box>
        }
        onClick={handleOpen}
        sx={{ height: 36, px: 0.5, fontSize: 14, cursor: 'pointer' }}
      />

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => { handleClose(); onEdit() }}>
          <ListItemIcon><EditRounded fontSize="small" /></ListItemIcon>
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => { handleClose(); onDelete() }}
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon><CloseRounded fontSize="small" /></ListItemIcon>
          Excluir
        </MenuItem>
      </Menu>
    </Box>
  )
}
