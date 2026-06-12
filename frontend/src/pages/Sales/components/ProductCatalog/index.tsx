import { SearchOutlined, GridViewRounded, TableRowsRounded, Inventory2Outlined, MiscellaneousServicesRounded } from '@mui/icons-material'
import { Box, CircularProgress, Grid, InputBase, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import FilterTabs from '../../../../components/FilterTabs'
import ProductCard from '../ProductCard'
import ServiceCard from '../ServiceCard'
import { formatBRL } from '../../../../utils/currency'
import { CatalogMode, CategoryValue, ProductCatalogProps } from './types'

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
      renderCell: ({ row }) => {
        const color = row.category?.color ?? 'primary.main'
        return (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              overflow: 'hidden',
              flexShrink: 0,
              bgcolor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
            }}
          >
            {row.imageUrl ? (
              <Box
                component="img"
                src={row.imageUrl}
                alt={row.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : mode === 'products' ? (
              <Inventory2Outlined sx={{ fontSize: 18, opacity: 0.7 }} />
            ) : (
              <MiscellaneousServicesRounded sx={{ fontSize: 18, opacity: 0.7 }} />
            )}
          </Box>
        )
      },
    },
    {
      field: 'name',
      headerName: 'Nome',
      flex: 1,
      renderCell: ({ value }) => <Typography variant="body2">{value}</Typography>,
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
            placeholder={mode === 'products' ? 'Buscar produto...' : 'Buscar serviço...'}
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
          <ToggleButton value="services">Serviços</ToggleButton>
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
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.tertiary', fontSize: 14 }}>
            {mode === 'products' ? 'Nenhum produto encontrado.' : 'Nenhum serviço encontrado.'}
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
            sx={(theme) => ({
              border: `1px solid ${theme.palette.border.subtle}`,
              borderRadius: 2,
              cursor: 'pointer',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.surface.sunken,
                borderBottom: `1px solid ${theme.palette.border.subtle}`,
              },
              '& .MuiDataGrid-columnHeader': {
                '&:focus, &:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.05em',
                color: theme.palette.text.tertiary,
                textTransform: 'uppercase',
              },
              '& .MuiDataGrid-columnSeparator': { display: 'none' },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                '&:focus, &:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: theme.palette.surface.sunken,
              },
              '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
                borderBottom: 'none',
              },
            })}
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
