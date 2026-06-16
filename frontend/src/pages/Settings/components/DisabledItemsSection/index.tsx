import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import DeleteForeverOutlined from '@mui/icons-material/DeleteForeverOutlined'
import InboxOutlined from '@mui/icons-material/InboxOutlined'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import RestoreOutlined from '@mui/icons-material/RestoreOutlined'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import SettingCard from '../../../../components/SettingCard'
import ModalHeader from '../../../../components/ModalHeader'
import ChipSelect from '../../../../components/ChipSelect'
import { useInactiveProducts, useRestoreProduct, useHardDeleteProduct } from '../../../../hooks/useProducts'
import { useInactiveProductCategories, useRestoreProductCategory, useHardDeleteProductCategory } from '../../../../hooks/useProductCategories'
import { useInactiveServices, useRestoreService, useHardDeleteService } from '../../../../hooks/useServices'
import { useInactiveServiceCategories, useRestoreServiceCategory, useHardDeleteServiceCategory } from '../../../../hooks/useServiceCategories'
import { useInactiveCustomers, useRestoreCustomer, useHardDeleteCustomer } from '../../../../hooks/useCustomers'
import { useInactiveSuppliers, useRestoreSupplier, useHardDeleteSupplier } from '../../../../hooks/useSuppliers'
import { useInactiveEmployees, useReactivateEmployee, useHardDeleteEmployee } from '../../../../hooks/useEmployees'
import { useInactiveRoles, useRestoreRole, useHardDeleteRole } from '../../../../hooks/useTeamRoles'

type InactiveItem = { id: string; name: string }

interface ConfirmState {
  items: InactiveItem[]
  tabIndex: number
}

const TAB_OPTIONS = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'cat-produto', label: 'Cat. Produto' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'cat-servico', label: 'Cat. Serviço' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'funcionarios', label: 'Funcionários' },
  { id: 'cargos', label: 'Cargos' },
]

function NoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 5, color: 'text.tertiary' }}>
      <InboxOutlined sx={{ fontSize: 36 }} />
      <Typography variant="body2">Nenhum item desativado</Typography>
    </Box>
  )
}

interface InactiveItemRowMenuProps {
  onRestore: () => void
  onRequestDelete: () => void
  isPending: boolean
}

function InactiveItemRowMenu({ onRestore, onRequestDelete, isPending }: InactiveItemRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const handleClose = () => setAnchor(null)

  return (
    <>
      <IconButton
        size="small"
        disabled={isPending}
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        sx={{ color: 'text.disabled' }}
      >
        {isPending
          ? <CircularProgress size={16} />
          : <MoreHorizRounded sx={{ fontSize: 18 }} />}
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { handleClose(); onRestore() }}>
          <RestoreOutlined />
          Reativar
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => { handleClose(); onRequestDelete() }}
          sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
        >
          <DeleteForeverOutlined />
          Excluir definitivamente
        </MenuItem>
      </Menu>
    </>
  )
}

export default function DisabledItemsSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSubtab = searchParams.get('subtab')
  const tabIndex = Math.max(0, TAB_OPTIONS.findIndex(t => t.id === rawSubtab))

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [pendingRestoreIds, setPendingRestoreIds] = useState<Set<string>>(new Set())
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set())
  const [selection, setSelection] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() })

  useEffect(() => {
    setSelection({ type: 'include', ids: new Set() })
  }, [tabIndex])

  const { data: products, isLoading: loadingProducts } = useInactiveProducts()
  const { data: productCats, isLoading: loadingProductCats } = useInactiveProductCategories()
  const { data: services, isLoading: loadingServices } = useInactiveServices()
  const { data: serviceCats, isLoading: loadingServiceCats } = useInactiveServiceCategories()
  const { data: customers, isLoading: loadingCustomers } = useInactiveCustomers()
  const { data: suppliers, isLoading: loadingSuppliers } = useInactiveSuppliers()
  const { data: employees, isLoading: loadingEmployees } = useInactiveEmployees()
  const { data: roles, isLoading: loadingRoles } = useInactiveRoles()

  const restoreProduct = useRestoreProduct()
  const hardDeleteProduct = useHardDeleteProduct()
  const restoreProductCat = useRestoreProductCategory()
  const hardDeleteProductCat = useHardDeleteProductCategory()
  const restoreService = useRestoreService()
  const hardDeleteService = useHardDeleteService()
  const restoreServiceCat = useRestoreServiceCategory()
  const hardDeleteServiceCat = useHardDeleteServiceCategory()
  const restoreCustomer = useRestoreCustomer()
  const hardDeleteCustomer = useHardDeleteCustomer()
  const restoreSupplier = useRestoreSupplier()
  const hardDeleteSupplier = useHardDeleteSupplier()
  const reactivateEmployee = useReactivateEmployee()
  const hardDeleteEmployee = useHardDeleteEmployee()
  const restoreRole = useRestoreRole()
  const hardDeleteRole = useHardDeleteRole()

  const addRestorePending = (id: string) =>
    setPendingRestoreIds(prev => new Set([...prev, id]))
  const removeRestorePending = (id: string) =>
    setPendingRestoreIds(prev => { const s = new Set(prev); s.delete(id); return s })
  const addDeletePending = (id: string) =>
    setPendingDeleteIds(prev => new Set([...prev, id]))
  const removeDeletePending = (id: string) =>
    setPendingDeleteIds(prev => { const s = new Set(prev); s.delete(id); return s })

  const tabs = [
    {
      items: products,
      isLoading: loadingProducts,
      onRestore: (id: string) => { addRestorePending(id); restoreProduct.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteProduct.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: productCats,
      isLoading: loadingProductCats,
      onRestore: (id: string) => { addRestorePending(id); restoreProductCat.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteProductCat.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: services,
      isLoading: loadingServices,
      onRestore: (id: string) => { addRestorePending(id); restoreService.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteService.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: serviceCats,
      isLoading: loadingServiceCats,
      onRestore: (id: string) => { addRestorePending(id); restoreServiceCat.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteServiceCat.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: customers,
      isLoading: loadingCustomers,
      onRestore: (id: string) => { addRestorePending(id); restoreCustomer.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteCustomer.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: suppliers,
      isLoading: loadingSuppliers,
      onRestore: (id: string) => { addRestorePending(id); restoreSupplier.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteSupplier.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: employees,
      isLoading: loadingEmployees,
      onRestore: (id: string) => { addRestorePending(id); reactivateEmployee.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteEmployee.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
    {
      items: roles,
      isLoading: loadingRoles,
      onRestore: (id: string) => { addRestorePending(id); restoreRole.mutate(id, { onSettled: () => removeRestorePending(id) }) },
      onHardDelete: (id: string) => { addDeletePending(id); hardDeleteRole.mutate(id, { onSettled: () => removeDeletePending(id) }) },
    },
  ]

  const currentTab = tabs[tabIndex]

  const getSelectionIds = (): string[] => {
    const allIds = (currentTab.items ?? []).map(item => item.id)
    if (selection.type === 'include') {
      return [...selection.ids].map(String)
    }
    return allIds.filter(id => !selection.ids.has(id))
  }

  const selectionIds = getSelectionIds()
  const hasSelection = selectionIds.length > 0

  const clearSelection = () => setSelection({ type: 'include', ids: new Set() })

  const handleTabChange = (id: string | null) => {
    if (!id) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('subtab', id)
      return next
    }, { replace: true })
  }

  const handleRequestDelete = (items: InactiveItem[]) => {
    setConfirm({ items, tabIndex })
  }

  const handleBulkRestore = () => {
    selectionIds.forEach(id => currentTab.onRestore(id))
    clearSelection()
  }

  const handleBulkDelete = () => {
    const items = (currentTab.items ?? []).filter(item => selectionIds.includes(item.id))
    setConfirm({ items, tabIndex })
    clearSelection()
  }

  const handleConfirmDelete = () => {
    if (!confirm) return
    confirm.items.forEach(item => tabs[confirm.tabIndex].onHardDelete(item.id))
    setConfirm(null)
  }

  const handleCloseConfirm = () => setConfirm(null)

  const columns: GridColDef<InactiveItem>[] = [
    {
      field: 'name',
      headerName: 'Nome',
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.name}</Typography>
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
        <InactiveItemRowMenu
          onRestore={() => currentTab.onRestore(row.id)}
          onRequestDelete={() => handleRequestDelete([row])}
          isPending={pendingRestoreIds.has(row.id) || pendingDeleteIds.has(row.id)}
        />
      ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3,}}>
      <SettingCard
        title="Itens desativados"
        subtitle="Restaure itens desativados ou exclua-os definitivamente."
      >
        <Box sx={{ px: 2, pt: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 2, }}>
          <Box sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
            <ChipSelect
              size="large"
              options={TAB_OPTIONS}
              value={TAB_OPTIONS[tabIndex].id}
              onChange={handleTabChange}
            />
            {hasSelection && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestoreOutlined />}
                  onClick={handleBulkRestore}
                >
                  Reativar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverOutlined />}
                  onClick={handleBulkDelete}
                >
                  Excluir
                </Button>
              </Box>
            )}
          </Box>

          <DataGrid
            rows={currentTab.items ?? []}
            columns={columns}
            loading={currentTab.isLoading}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selection}
            onRowSelectionModelChange={setSelection}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            sx={{border: "1px solid", borderColor: "border.subtle",display: 'flex',}}
            slots={{ noRowsOverlay: NoRowsOverlay }}
          />
        </Box>
      </SettingCard>

      <Dialog open={!!confirm} onClose={handleCloseConfirm} maxWidth="sm" fullWidth>
        {confirm && (
          <>
            <ModalHeader
              title="Excluir definitivamente"
              subtitle={
                confirm.items.length === 1
                  ? 'Esta ação não pode ser desfeita.'
                  : `${confirm.items.length} itens serão excluídos permanentemente.`
              }
              onClose={handleCloseConfirm}
            />
            <DialogContent>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'error.soft',
                  color: 'error.ink',
                }}
              >
                <WarningAmberRounded sx={{ fontSize: 22, mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2">
                  {confirm.items.length === 1 ? (
                    <>
                      O item <strong>{confirm.items[0].name}</strong> será removido permanentemente
                      do banco de dados e não poderá ser recuperado.
                    </>
                  ) : (
                    <>
                      Os <strong>{confirm.items.length} itens selecionados</strong> serão removidos
                      permanentemente do banco de dados e não poderão ser recuperados.
                    </>
                  )}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button variant="ghost" onClick={handleCloseConfirm}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteForeverOutlined />}
                onClick={handleConfirmDelete}
              >
                Excluir
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
