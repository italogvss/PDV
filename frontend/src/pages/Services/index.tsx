import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  Chip,
  Skeleton,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import MiscellaneousServicesRounded from '@mui/icons-material/MiscellaneousServicesRounded'
import CategoryRounded from '@mui/icons-material/CategoryRounded'
import SellRounded from '@mui/icons-material/SellRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import type { Service, ServiceCategory } from '../../types/service.types'
import KpiCard from './components/KpiCard'
import FilterMenu from './components/FilterMenu'
import ServiceRowMenu from './components/ServiceRowMenu'
import ServiceModal from './components/ServiceModal'
import CategoryFormModal from './components/CategoryFormModal'
import { useServices, useDeleteService } from '../../hooks/useServices'
import { useServiceCategories, useDeleteServiceCategory } from '../../hooks/useServiceCategories'

const STATUS_OPTIONS = ['Ativo', 'Inativo']

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function ServicesPage() {
  const { data: services = [], isLoading: isLoadingServices } = useServices()
  const { data: categories = [], isLoading: isLoadingCategories } = useServiceCategories()
  const deleteService = useDeleteService()
  const deleteCategory = useDeleteServiceCategory()

  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [sortBy, setSortBy] = useState('name-asc')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    services.forEach((s) => {
      const key = s.category?.name ?? ''
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [services])

  const kpis = useMemo(() => {
    const activeCount = services.filter((s) => s.isActive).length
    const avgPrice =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.price, 0) / services.length
        : 0
    const withDuration = services.filter((s) => s.durationMinutes != null).length
    return { activeCount, avgPrice, withDuration }
  }, [services])

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'name',
        headerName: 'Serviço',
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
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              {row.description && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{
                    display: 'block',
                    maxWidth: 260,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        field: 'category',
        headerName: 'Categoria',
        width: 150,
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
        field: 'durationMinutes',
        headerName: 'Duração',
        width: 110,
        renderCell: ({ row }) =>
          row.durationMinutes != null ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeRounded sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                {formatDuration(row.durationMinutes)}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'price',
        headerName: 'Preço',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatBRL(row.price)}
          </Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 110,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            label={row.isActive ? 'Ativo' : 'Inativo'}
            color={row.isActive ? 'success' : 'default'}
            variant={row.isActive ? 'filled' : 'outlined'}
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
          <ServiceRowMenu
            service={row}
            onEdit={setEditService}
            onDelete={(id) => deleteService.mutate(id)}
          />
        ),
      },
    ],
    [deleteService],
  )

  const rows = useMemo(() => {
    const filtered = services.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch = s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      const matchCategory =
        selectedCategories.length === 0 ||
        (s.category !== null && selectedCategories.includes(s.category.name))
      const statusLabel = s.isActive ? 'Ativo' : 'Inativo'
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(statusLabel)
      return matchSearch && matchCategory && matchStatus
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name, 'pt-BR')
        case 'name-desc': return b.name.localeCompare(a.name, 'pt-BR')
        case 'price-asc': return a.price - b.price
        case 'price-desc': return b.price - a.price
        default: return 0
      }
    })
  }, [services, search, selectedCategories, selectedStatuses, sortBy])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '150vh' }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h1">Serviços</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isLoadingServices ? '...' : `${services.length} serviços cadastrados`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddRounded />}
            onClick={() => setNewModalOpen(true)}
          >
            Novo serviço
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        <KpiCard
          label="Total de serviços"
          icon={MiscellaneousServicesRounded}
          value={isLoadingServices ? '—' : services.length}
          badge={{ label: `${categories.length} categorias`, color: 'default' }}
        />
        <KpiCard
          label="Serviços ativos"
          icon={CheckCircleOutlineRounded}
          value={isLoadingServices ? '—' : kpis.activeCount}
          badge={{ label: 'disponíveis', color: 'success' }}
        />
        <KpiCard
          label="Preço médio"
          icon={SellRounded}
          value={isLoadingServices ? '—' : formatBRL(kpis.avgPrice)}
          badge={{ label: 'por serviço', color: 'default' }}
        />
        <KpiCard
          label="Com duração definida"
          icon={AccessTimeRounded}
          value={isLoadingServices ? '—' : kpis.withDuration}
          badge={{ label: 'com tempo estimado', color: 'default' }}
        />
      </Box>

      {/* Strip de categorias */}
      <Box>
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

        {isLoadingCategories ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width={100} height={36} sx={{ borderRadius: '999px' }} />
            ))}
          </Box>
        ) : categories.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2.5 }}>
            <Typography variant="body2" color="text.disabled">
              Nenhuma categoria cadastrada ainda
            </Typography>
            <Chip
              label="+ Adicionar"
              size="small"
              variant="outlined"
              onClick={() => setAddCategoryOpen(true)}
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
                category={cat}
                count={countByCategory[cat.name] ?? 0}
                onEdit={() => setEditingCategory(cat)}
                onDelete={() => deleteCategory.mutate(cat.id)}
              />
            ))}

            <Chip
              label="+ Adicionar"
              size="small"
              variant="outlined"
              onClick={() => setAddCategoryOpen(true)}
              sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed', borderColor: 'success.main', color: 'success.main', height: 36, fontSize: 14, px: 0.5 }}
            />
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
            placeholder="Buscar serviço ou descrição..."
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
            options={STATUS_OPTIONS}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
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
          </Select>
        </Box>

        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={64}
          loading={isLoadingServices}
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
      <ServiceModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />
      <ServiceModal
        open={!!editService}
        service={editService ?? undefined}
        onClose={() => setEditService(null)}
      />
      <CategoryFormModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
      <CategoryFormModal
        open={!!editingCategory}
        category={editingCategory ?? undefined}
        onClose={() => setEditingCategory(null)}
      />
    </Box>
  )
}

// ─── CategoryChip ─────────────────────────────────────────────────────────────

interface CategoryChipProps {
  category: ServiceCategory
  count: number
  onEdit: () => void
  onDelete: () => void
}

function CategoryChip({ category, count, onEdit, onDelete }: CategoryChipProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <Box
      sx={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
        sx={{
          height: 36,
          px: 0.5,
          pr: hovered ? 5.5 : undefined,
          transition: 'padding 0.15s',
          fontSize: 14,
        }}
      />
      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: 4,
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: 0.25,
          }}
        >
          <IconButton
            size="small"
            onClick={onEdit}
            sx={{
              width: 20,
              height: 20,
              p: 0,
              bgcolor: 'surface.paper',
              border: '1px solid',
              borderColor: 'border.subtle',
              '&:hover': { bgcolor: 'surface.raised' },
            }}
          >
            <EditRounded sx={{ fontSize: 11 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{
              width: 20,
              height: 20,
              p: 0,
              bgcolor: 'surface.paper',
              border: '1px solid',
              borderColor: 'border.subtle',
              '&:hover': { bgcolor: 'error.soft', borderColor: 'error.main' },
            }}
          >
            <CloseRounded sx={{ fontSize: 11 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}
