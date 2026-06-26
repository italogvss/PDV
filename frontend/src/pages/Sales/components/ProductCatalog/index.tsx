import { SearchOutlined, GridViewRounded, TableRowsRounded, Inventory2Outlined, MiscellaneousServicesRounded, AddRounded } from '@mui/icons-material'
import { Box, Button, CircularProgress, Grid, InputBase, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../../store'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import FilterTabs from '../../../../components/FilterTabs'
import ProductCard from '../ProductCard'
import ServiceCard from '../ServiceCard'
import { formatBRL } from '../../../../utils/currency'
import { CatalogMode, CategoryValue, ProductCatalogProps } from './types'
import DataGridNoRowsOverlay from '../../../../components/DataGridNoRowsOverlay'

type ViewMode = 'cards' | 'list'

export default function ProductCatalog({
  mode,
  onModeChange,
  products,
  productCategories,
  services,
  serviceCategories,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onAddProduct,
  onAddService,
  isLoading,
}: ProductCatalogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const navigate = useNavigate()
  const hasServices = useAppSelector((s) => s.auth.modules.includes('services'))

  const tabs: Array<{ value: CategoryValue; label: string; color?: string }> =
    mode === 'products'
      ? [
        { value: 'all' as CategoryValue, label: 'Tudo', color: 'secondary.main' },
        ...productCategories.map((c) => ({ value: c.id as CategoryValue, label: c.name, color: c.color })),
      ]
      : [
        { value: 'all' as CategoryValue, label: 'Tudo', color: 'secondary.main' },
        ...serviceCategories.map((c) => ({ value: c.id as CategoryValue, label: c.name, color: c.color })),
      ]

  const items = mode === 'products' ? products : services
  const isEmpty = items.length === 0

  const listColumns: GridColDef[] = [
    {
      field: '_photo',
      headerName: '',
      width: 52,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid',
            borderColor: 'border.strong',
          }}
        >
          {row.imageUrl ? (
            <Box
              component="img"
              src={row.imageUrl}
              alt={row.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: (theme) =>
                  `repeating-linear-gradient(-45deg, ${theme.palette.background.default}, ${theme.palette.background.default} 4px, ${theme.palette.divider} 4px, ${theme.palette.divider} 8px)`,
              }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: 'Nome',
      flex: 1,
      renderCell: ({ value }) => <Typography variant="body2">{value}</Typography>,
    },
    {
      field: 'category',
      headerName: 'Categoria',
      width: 140,
      renderCell: ({ row }) =>
        row.category ? (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: 'surface.sunken',
              border: '1px solid',
              borderColor: 'border.subtle',
              borderRadius: '999px',
              px: 1.25,
              py: 0.5,
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: row.category.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              {row.category.name}
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'stock',
      headerName: 'Qtd.',
      width: 72,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">
          {value ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'price',
      headerName: 'Preço',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatBRL(value)}
        </Typography>
      ),
    },
  ]

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box
          sx={{
            flex: 1,
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={mode === 'products' ? 'Buscar produto por nome ou código de barras' : 'Buscar serviço...'}
            sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}
          />
          {isLoading && <CircularProgress size={14} color="inherit" />}
        </Box>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v: CatalogMode | null) => v && onModeChange(v)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="products">Produtos</ToggleButton>
          {hasServices && <ToggleButton value="services">Serviços</ToggleButton>}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FilterTabs value={category} onChange={onCategoryChange} options={tabs} />
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="cards"><GridViewRounded sx={{ fontSize: 18 }} /></ToggleButton>
          <ToggleButton value="list"><TableRowsRounded sx={{ fontSize: 18 }} /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 1,
          mr: -1,
        }}
      >
        {isLoading && isEmpty ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : isEmpty ? (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, color: 'text.tertiary' }}>
            {mode === 'products'
              ? <Inventory2Outlined sx={{ fontSize: 52 }} />
              : <MiscellaneousServicesRounded sx={{ fontSize: 52 }} />
            }
            <Typography variant="body2" color="text.tertiary">
              {mode === 'products' ? 'Nenhum produto encontrado.' : 'Nenhum serviço encontrado.'}
            </Typography>
            {!search && category === 'all' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddRounded />}
                onClick={() => navigate(mode === 'products' ? '/estoque' : '/servicos')}
                sx={{ mt: 1 }}
              >
                {mode === 'products' ? 'Cadastrar produto' : 'Cadastrar serviço'}
              </Button>
            )}
          </Box>
        ) : viewMode === 'list' ? (
          <DataGrid
            rows={items}
            columns={listColumns}
            hideFooter
            disableRowSelectionOnClick
            rowHeight={48}
            onRowClick={({ row }) =>
              mode === 'products' ? onAddProduct(row.id) : onAddService(row.id)
            }
            slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          />
        ) : mode === 'products' ? (
          <Grid container spacing={1}>
            {products.map((p) => (
              <Grid key={p.id} size={{ xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}>
                <ProductCard product={p} onAdd={onAddProduct} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={1}>
            {services.map((s) => (
              <Grid key={s.id} size={{ xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}>
                <ServiceCard service={s} onAdd={onAddService} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  )
}
