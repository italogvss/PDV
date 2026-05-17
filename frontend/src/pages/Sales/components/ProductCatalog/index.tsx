import { Box, InputBase, Tab, Tabs } from '@mui/material'
import { SearchOutlined } from '@mui/icons-material'
import ProductCard from '../ProductCard'
import { CATEGORIES } from '../../data'
import { ProductCatalogProps, CategoryValue } from './types'

export default function ProductCatalog({
  products,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  onAddProduct,
}: ProductCatalogProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
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
            placeholder="Buscar por nome ou SKU..."
            sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}
          />
        </Box>
      </Box>

      <Tabs
        value={category}
        onChange={(_, value: CategoryValue) => onCategoryChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          borderRadius: 2,
          border: 1,
          borderColor: 'border.subtle',
          '&.MuiTabs-list': {
            border: "none",
          },
          '& .MuiTab-root': {
            minHeight: 36,
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 500,
            color: 'text.secondary',
            px: 3,
            border: "none",
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
        {CATEGORIES.map((c) => (
          <Tab key={c.value} value={c.value} label={c.label} />
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
        {products.length === 0 ? (
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAddProduct} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
