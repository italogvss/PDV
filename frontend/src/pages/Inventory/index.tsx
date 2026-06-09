import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Typography,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import SellRounded from '@mui/icons-material/SellRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import CancelRounded from '@mui/icons-material/CancelRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import CategoryRounded from '@mui/icons-material/CategoryRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import type { Product, ProductCategory } from '../../types/product.types'
import { STOCK_LEVELS } from '../../types/product.types'
import { getStockLevel } from './utils'
import StockLevelCell from './components/StockLevelCell'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import FilterMenu from './components/FilterMenu'
import ProductRowMenu from './components/ProductRowMenu'
import ProductModal from './components/NewProductModal'
import CategoryStrip from '../../components/CategoryStrip'
import CategoryFormModal from '../../components/CategoryFormModal'
import AdjustStockModal from './components/AdjustStockModal'
import { useProducts, useDeleteProduct } from '../../hooks/useProducts'
import { useProductCategories, useDeleteProductCategory, useCreateProductCategory, useUpdateProductCategory } from '../../hooks/useProductCategories'

export default function InventoryPage() {
  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const { data: categories = [], isLoading: isLoadingCategories } = useProductCategories()
  const deleteProduct = useDeleteProduct()
  const deleteCategory = useDeleteProductCategory()
  const createCategory = useCreateProductCategory()
  const updateCategory = useUpdateProductCategory()

  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [adjustStockProduct, setAdjustStockProduct] = useState<Product | null>(null)
  const [sortBy, setSortBy] = useState('name-asc')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      const key = p.category?.name ?? ''
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [products])

  const kpis = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0)
    const levels = products.map((p) => getStockLevel(p.stock, p.minStock, p.criticalStock))
    const lowCount = levels.filter((l) => l === 'Baixo').length
    const criticalCount = levels.filter((l) => l === 'Crítico').length
    return { totalValue, totalUnits, lowCount, criticalCount }
  }, [products])

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'name',
        headerName: 'Produto',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: row.category ? `${row.category.color}22` : 'surface.raised',
                border: '1px solid',
                borderColor: row.category ? `${row.category.color}66` : 'border.subtle',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <CategoryRounded
                sx={{ fontSize: 15, color: row.category ? row.category.color : 'text.tertiary' }}
              />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.name}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'barcode',
        headerName: 'Código',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.tertiary" className="mono">
            {row.barcode ?? '—'}
          </Typography>
        ),
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
                bgcolor: 'surface.raised',
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
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {row.category.name}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'costPrice',
        headerName: 'Custo',
        width: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatBRL(row.costPrice)}
          </Typography>
        ),
      },
      {
        field: 'price',
        headerName: 'Preço',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Typography variant="body2">{formatBRL(row.price)}</Typography>
        ),
      },
      {
        field: 'stock',
        headerName: 'Estoque',
        width: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.stock}
          </Typography>
        ),
      },
      {
        field: 'level',
        headerName: 'Nível',
        width: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <StockLevelCell stock={row.stock} minStock={row.minStock} criticalStock={row.criticalStock} />
        ),
      },
      {
        field: 'rowActions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <ProductRowMenu
            product={row}
            onEdit={setEditProduct}
            onAdjustStock={setAdjustStockProduct}
            onDelete={(id) => deleteProduct.mutate(id)}
          />
        ),
      },
    ],
    [deleteProduct],
  )

  const rows = useMemo(() => {
    const filtered = products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        p.name.toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q)
      const matchCategory =
        selectedCategories.length === 0 ||
        (p.category !== null && selectedCategories.includes(p.category.name))
      const level = getStockLevel(p.stock, p.minStock, p.criticalStock)
      const matchLevel = selectedLevels.length === 0 || selectedLevels.includes(level)
      return matchSearch && matchCategory && matchLevel
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name, 'pt-BR')
        case 'name-desc': return b.name.localeCompare(a.name, 'pt-BR')
        case 'price-asc': return a.price - b.price
        case 'price-desc': return b.price - a.price
        case 'stock-asc': return a.stock - b.stock
        case 'stock-desc': return b.stock - a.stock
        default: return 0
      }
    })
  }, [products, search, selectedCategories, selectedLevels, sortBy])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '150vh' }}>
      <PageHeader
        title="Estoque"
        description={isLoadingProducts ? '...' : `${products.length} produtos cadastrados`}
      >
        <Button variant="contained" color="success" startIcon={<AddRounded />} onClick={() => setNewModalOpen(true)}>
          Novo produto
        </Button>
      </PageHeader>

      <PageKpiGrid>
        <PageKpiCard
          icon={Inventory2Rounded}
          label="Total em estoque"
          value={isLoadingProducts ? '—' : formatBRL(kpis.totalValue)}
          badge={{ label: `${kpis.totalUnits} unidades`, color: 'success' }}
        />
        <PageKpiCard
          icon={SellRounded}
          label="Produtos"
          value={isLoadingProducts ? '—' : products.length}
          badge={{ label: `${categories.length} categorias`, color: 'default' }}
        />
        <PageKpiCard
          icon={WarningAmberRounded}
          label="Estoque baixo"
          value={isLoadingProducts ? '—' : kpis.lowCount}
          valueColor={kpis.lowCount > 0 ? 'warning' : undefined}
          badge={{ label: 'Repor em breve', color: 'warning', icon: WarningAmberRounded }}
        />
        <PageKpiCard
          icon={CancelRounded}
          label="Crítico"
          value={isLoadingProducts ? '—' : kpis.criticalCount}
          valueColor={kpis.criticalCount > 0 ? 'error' : undefined}
          badge={{ label: 'Urgente', color: 'error', icon: ArrowDownwardRounded }}
        />
      </PageKpiGrid>

      {/* Strip de categorias */}
      <CategoryStrip
        categories={categories}
        countByCategory={countByCategory}
        isLoading={isLoadingCategories}
        onAdd={() => setAddCategoryOpen(true)}
        onEdit={(cat) => setEditingCategory(cat)}
        onDelete={(id) => deleteCategory.mutate(id)}
      />

      {/* Barra de busca e filtros */}
      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar produto ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 280 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FilterMenu
            label="Categoria"
            options={categories.map((c) => c.name)}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />

          <FilterMenu
            label="Status"
            options={STOCK_LEVELS}
            selected={selectedLevels}
            onChange={setSelectedLevels}
          />

          <Box sx={{ flex: 1 }} />

          <Select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ fontSize: 13, minWidth: 170 }}
          >
            <MenuItem value="name-asc">Nome (A → Z)</MenuItem>
            <MenuItem value="name-desc">Nome (Z → A)</MenuItem>
            <MenuItem value="price-asc">Preço (menor → maior)</MenuItem>
            <MenuItem value="price-desc">Preço (maior → menor)</MenuItem>
            <MenuItem value="stock-asc">Estoque (menor → maior)</MenuItem>
            <MenuItem value="stock-desc">Estoque (maior → menor)</MenuItem>
          </Select>
        </Box>

        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={64}
          loading={isLoadingProducts}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={(theme) => ({
            flex: 1,
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.surface.sunken,
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
            },
            '& .MuiDataGrid-columnHeader': { '&:focus, &:focus-within': { outline: 'none' } },
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
            '& .MuiDataGrid-row:hover': { backgroundColor: theme.palette.surface.sunken },
            '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': { borderBottom: 'none' },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.border.subtle}`,
              minHeight: 48,
            },
            '& .MuiDataGrid-selectedRowCount': { display: 'none' },
          })}
        />
      </Card>

      {/* Modais */}
      <ProductModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />
      <ProductModal
        open={!!editProduct}
        product={editProduct ?? undefined}
        onClose={() => setEditProduct(null)}
      />
      {adjustStockProduct && (
        <AdjustStockModal
          open={!!adjustStockProduct}
          product={adjustStockProduct}
          onClose={() => setAdjustStockProduct(null)}
        />
      )}
      <CategoryFormModal
        open={addCategoryOpen || !!editingCategory}
        onClose={() => { setAddCategoryOpen(false); setEditingCategory(null) }}
        category={editingCategory ?? undefined}
        onSave={async (data) => {
          if (editingCategory) {
            await updateCategory.mutateAsync({ id: editingCategory.id, ...data })
          } else {
            await createCategory.mutateAsync(data)
          }
        }}
        isPending={createCategory.isPending || updateCategory.isPending}
      />
    </Box>
  )
}

