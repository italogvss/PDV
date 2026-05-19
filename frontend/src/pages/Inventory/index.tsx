import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  Chip,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
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
import { MOCK_PRODUCT_CATEGORIES, MOCK_PRODUCTS } from './mock'
import type { Product, ProductCategory } from '../../types/product.types'
import { PRODUCT_CATEGORIES, STOCK_LEVELS } from '../../types/product.types'
import { getStockLevel } from './utils'
import KpiCard from './components/KpiCard'
import StockLevelCell from './components/StockLevelCell'
import FilterMenu from './components/FilterMenu'
import ProductRowMenu from './components/ProductRowMenu'
import ProductModal from './components/NewProductModal'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [sortBy, setSortBy] = useState('name-asc')
  const [categories, setCategories] = useState<ProductCategory[]>([...MOCK_PRODUCT_CATEGORIES])
  const [showAddCatInput, setShowAddCatInput] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    MOCK_PRODUCTS.forEach((p) => {
      const key = p.category?.name ?? ''
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [])

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim()
    if (trimmed && !categories.some((cat) => cat.name === trimmed)) {
      setCategories((prev) => [...prev, { id: prev.length + 1, name: trimmed, color: "#121212" }])
    }
    setNewCatInput('')
    setShowAddCatInput(false)
  }

  const kpis = useMemo(() => {
    const totalValue = MOCK_PRODUCTS.reduce((sum, p) => sum + p.price * p.stock, 0)
    const totalUnits = MOCK_PRODUCTS.reduce((sum, p) => sum + p.stock, 0)
    const levels = MOCK_PRODUCTS.map((p) =>
      getStockLevel(p.stock, p.minStock, p.criticalStock),
    )
    const lowCount = levels.filter((l) => l === 'Baixo').length
    const criticalCount = levels.filter((l) => l === 'Crítico').length
    const categoryCount = new Set(MOCK_PRODUCTS.map((p) => p.category)).size
    return { totalValue, totalUnits, lowCount, criticalCount, categoryCount }
  }, [])

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
                bgcolor: 'surface.raised',
                border: '1px solid',
                borderColor: 'border.subtle',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <CategoryRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
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
        width: 130,
        renderCell: ({ row }) => (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              bgcolor: 'surface.raised',
              border: '1px solid',
              borderColor: 'border.subtle',
              borderRadius: '999px',
              px: 1.25,
              py: 0.5,
            }}
          >
            {row.category}
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
          <StockLevelCell
            stock={row.stock}
            minStock={row.minStock}
            criticalStock={row.criticalStock}
          />
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
          <ProductRowMenu product={row} onEdit={setEditProduct} />
        ),
      },
    ],
    [],
  )

  const rows = useMemo(() => {
    const filtered = MOCK_PRODUCTS.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q)
      const matchCategory =
        selectedCategories.length === 0 || (p.category !== null && selectedCategories.includes(p.category.name))
      const level = getStockLevel(p.stock, p.minStock, p.criticalStock)
      const matchLevel = selectedLevels.length === 0 || selectedLevels.includes(level)
      return matchSearch && matchCategory && matchLevel
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':  return a.name.localeCompare(b.name, 'pt-BR')
        case 'name-desc': return b.name.localeCompare(a.name, 'pt-BR')
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
        case 'stock-asc':  return a.stock - b.stock
        case 'stock-desc': return b.stock - a.stock
        default: return 0
      }
    })
  }, [search, selectedCategories, selectedLevels, sortBy])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '150vh' }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h1">Estoque</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {MOCK_PRODUCTS.length} produtos cadastrados
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadOutlined />}
          >
            Importar CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
            onClick={() => setNewModalOpen(true)}
          >
            Novo produto
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <KpiCard
          label="Total em estoque"
          icon={Inventory2Rounded}
          value={formatBRL(kpis.totalValue)}
          badge={{ label: `${kpis.totalUnits} unidades`, color: 'success' }}
        />
        <KpiCard
          label="Produtos"
          icon={SellRounded}
          value={MOCK_PRODUCTS.length}
          badge={{ label: `${kpis.categoryCount} categorias`, color: 'default' }}
        />
        <KpiCard
          label="Estoque baixo"
          icon={WarningAmberRounded}
          value={kpis.lowCount}
          valueColor="warning"
          badge={{
            label: 'Repor em breve',
            color: 'warning',
            icon: WarningAmberRounded,
          }}
        />
        <KpiCard
          label="Crítico"
          icon={CancelRounded}
          value={kpis.criticalCount}
          valueColor="error"
          badge={{
            label: 'Urgente',
            color: 'error',
            icon: ArrowDownwardRounded,
          }}
        />
      </Box>

      {/* Strip de categorias */}
      <Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1.5 }}
        >
          Categorias
        </Typography>

        {categories.length === 0 && !showAddCatInput ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2.5 }}>
            <Typography variant="body2" color="text.disabled">
              Nenhuma categoria cadastrada ainda
            </Typography>
            <Chip
              label="+ Adicionar"
              size="small"
              variant="outlined"
              onClick={() => setShowAddCatInput(true)}
              sx={{ cursor: 'pointer', borderStyle: 'dashed', borderColor: 'success.main', color: 'success.main', height: 36, fontSize: 14, px: 0.5 }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              flexWrap: 'nowrap',
              pb: 0.5,
              '&::-webkit-scrollbar': { height: 3 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'border.subtle', borderRadius: '999px' },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            }}
          >
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                count={countByCategory[cat.name] ?? 0}
                onDelete={() => setCategories((prev) => prev.filter((c) => c.id !== cat.id))}
              />
            ))}

            {showAddCatInput ? (
              <TextField
                size="small"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory()
                  if (e.key === 'Escape') { setShowAddCatInput(false); setNewCatInput('') }
                }}
                onBlur={handleAddCategory}
                autoFocus
                placeholder="Nome da categoria"
                sx={{ minWidth: 150, flexShrink: 0 }}
                slotProps={{ htmlInput: { style: { padding: '5px 10px', fontSize: 13 } } }}
              />
            ) : (
              <Chip
                label="+ Adicionar"
                size="small"
                variant="outlined"
                onClick={() => setShowAddCatInput(true)}
                sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed', borderColor: 'success.main', color: 'success.main', height: 36, fontSize: 14, px: 0.5 }}
              />
            )}
          </Box>
        )}
      </Box>

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
            options={PRODUCT_CATEGORIES}
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

        {/* DataGrid */}
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={(theme) => ({
            flex: 1,
            border: 'none',
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
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.border.subtle}`,
              minHeight: 48,
            },
            '& .MuiDataGrid-selectedRowCount': { display: 'none' },
          })}
        />
      </Card>

      <ProductModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />
      <ProductModal
        open={!!editProduct}
        product={editProduct ?? undefined}
        onClose={() => setEditProduct(null)}
      />
    </Box>
  )
}

// ─── CategoryChip ─────────────────────────────────────────────────────────────

interface CategoryChipProps {
  label: string
  count: number
  onDelete: () => void
}

function CategoryChip({ label, count, onDelete }: CategoryChipProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <Box
      sx={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Chip
        label={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{ opacity: 0.45, fontWeight: 400 }}
            >
              {count}
            </Typography>
          </Box>
        }
        sx={{
          height: 36,
          px: 0.5,
          pr: hovered ? 4 : undefined,
          transition: 'padding 0.15s',
          fontSize: 14,
        }}
      />
      {hovered && (
        <IconButton
          size="small"
          onClick={onDelete}
          sx={{
            position: 'absolute',
            top: '50%',
            right: 6,
            transform: 'translateY(-50%)',
            width: 22,
            height: 22,
            p: 0,
            bgcolor: 'surface.paper',
            border: '1px solid',
            borderColor: 'border.subtle',
            '&:hover': { bgcolor: 'error.soft', borderColor: 'error.main' },
          }}
        >
          <CloseRounded sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  )
}
