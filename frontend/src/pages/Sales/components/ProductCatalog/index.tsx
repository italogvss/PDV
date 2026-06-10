import { SearchOutlined } from '@mui/icons-material'
import { Box, CircularProgress, Grid, InputBase, Tab, Tabs, ToggleButton, ToggleButtonGroup } from '@mui/material'
import ProductCard from '../ProductCard'
import ServiceCard from '../ServiceCard'
import { CatalogMode, CategoryValue, ProductCatalogProps } from './types'

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
  const tabs: Array<{ value: CategoryValue; label: string; color?: string }> =
    mode === 'products'
      ? [
        { value: 'all' as CategoryValue, label: 'Tudo' },
        ...productCategories.map((c) => ({ value: c.id as CategoryValue, label: c.name, color: c.color })),
      ]
      : [
        { value: 'all' as CategoryValue, label: 'Tudo' },
        ...serviceCategories.map((c) => ({ value: c.id as CategoryValue, label: c.name, color: c.color })),
      ]

  const items = mode === 'products' ? products : services
  const isEmpty = items.length === 0

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
          sx={{
            flexShrink: 0,        
          }}
        >
          <ToggleButton value="products" >
            Produtos
          </ToggleButton>
          <ToggleButton value="services" >
            Serviços
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Tabs
        value={category}
        onChange={(_, value: CategoryValue) => onCategoryChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          maxWidth: '100%',
          borderRadius: 999,
          border: 1,
          borderColor: 'border.subtle',
          '& .MuiTab-root': {
            minHeight: 36,
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 500,
            color: 'text.secondary',
            px: 3,
            border: 'none',
            borderRadius: 2,
            mr: 1,
            my: 0.75
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} sx={{
            '&.Mui-selected': {
              color: 'black',
              bgcolor: t.color,
            },
          }} />
        ))}
      </Tabs>

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
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              color: 'text.tertiary',
              fontSize: 14,
            }}
          >
            {mode === 'products' ? 'Nenhum produto encontrado.' : 'Nenhum serviço encontrado.'}
          </Box>
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
