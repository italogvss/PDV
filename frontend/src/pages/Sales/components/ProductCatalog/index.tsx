import { Box, CircularProgress, InputBase, Tab, Tabs } from '@mui/material'
import { Grid } from '@mui/material'
import { SearchOutlined } from '@mui/icons-material'
import ProductCard from '../ProductCard'
import { ProductCatalogProps, CategoryValue } from './types'

export default function ProductCatalog({
  products,
  categories,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onAddProduct,
  isLoading,
}: ProductCatalogProps) {
  const tabs = [
    { value: 'all' as CategoryValue, label: 'Tudo' },
    ...categories.map((c) => ({ value: c.id as CategoryValue, label: c.name })),
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
            placeholder="Buscar produto..."
            sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}
          />
          {isLoading && <CircularProgress size={14} color="inherit" />}
        </Box>
      </Box>

      <Tabs
        value={category}
        onChange={(_, value: CategoryValue) => onCategoryChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          maxWidth: '100%',
          borderRadius: 2,
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
            '&.Mui-selected': {
              color: 'text.primary',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'border.subtle',
            },
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
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
        {isLoading && products.length === 0 ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : products.length === 0 ? (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              color: 'text.tertiary',
              fontSize: 14,
            }}
          >
            Nenhum produto encontrado.
          </Box>
        ) : (
          <Grid container spacing={1}>
            {products.map((p) => (
              <Grid key={p.id} size={{ xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}>
                <ProductCard product={p} onAdd={onAddProduct} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  )
}
