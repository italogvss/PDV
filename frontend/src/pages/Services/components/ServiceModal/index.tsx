import { zodResolver } from '@hookform/resolvers/zod'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import {
  Box,
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useInventorySettings } from '../../../../hooks/useTenantSettings'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import DataGridNoRowsOverlay from '../../../../components/DataGridNoRowsOverlay'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import UpsellFeatureRow from '../../../../components/UpsellFeatureRow'
import { FEATURES } from '../../../../constants/entitlements'
import { useProducts } from '../../../../hooks/useProducts'
import { useEntitlements } from '../../../../hooks/useSubscription'
import { useServiceCategories } from '../../../../hooks/useServiceCategories'
import { useCreateService, useUpdateService } from '../../../../hooks/useServices'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import type { Product } from '../../../../types/product.types'
import type { ServiceProductItem } from '../../../../types/service.types'
import { formatBRL } from '../../../../utils/currency'
import type { ServiceModalProps } from './types'

const _baseServiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Não pode ter mais de 100 caracteres'),
  description: z.string().max(300, 'Não pode ter mais de 300 caracteres').optional().or(z.literal('')),
  durationMinutes: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(1)
    .optional()
    .or(z.literal('')),
  price: z.number().positive('Deve ser maior que zero'),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean(),
  costPrice: z.number().min(0).optional().nullable(),
})

type ServiceForm = z.infer<typeof _baseServiceSchema>

function buildServiceSchema(requireCostPrice: boolean) {
  return _baseServiceSchema.superRefine((data, ctx) => {
    if (requireCostPrice && (data.costPrice == null || data.costPrice <= 0)) {
      ctx.addIssue({ code: 'custom', message: 'Deve ser maior que zero', path: ['costPrice'] })
    }
  })
}

function buildDefaults(): ServiceForm {
  return {
    name: '',
    description: '',
    durationMinutes: '',
    price: 0,
    categoryId: null,
    isActive: true,
    costPrice: null,
  }
}

function calcSuggested(products: ServiceProductItem[]): number {
  return products.reduce((sum, p) => sum + (p.purchasePrice ?? 0) * p.quantity, 0)
}

const PRODUCT_COLUMNS: GridColDef[] = [
  { field: 'name', headerName: 'Nome', flex: 1, minWidth: 180 },
  {
    field: 'costPrice',
    headerName: 'Preço de custo',
    width: 140,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ value }) => formatBRL(value ?? 0),
  },
  {
    field: 'price',
    headerName: 'Preço de venda',
    width: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ value }) => formatBRL(value),
  },
]

export default function ServiceModal({ open, onClose, service }: ServiceModalProps) {
  const isEditing = !!service
  const createService = useCreateService()
  const updateService = useUpdateService()
  const { data: categories = [], isLoading: isLoadingCategories } = useServiceCategories()
  const { data: allProducts = [], isLoading: isLoadingProducts } = useProducts()
  const { isModuleEnabled } = useUserPermissions()
  const { has } = useEntitlements()
  const hasLinkedProducts = has(FEATURES.productLinkedToService)
  const { data: inventorySettings } = useInventorySettings()
  const requireCostPrice = inventorySettings?.requireCostPriceOnServices ?? true
  const schema = useMemo(() => buildServiceSchema(requireCostPrice), [requireCostPrice])
  const showProductsSection = isModuleEnabled('inventory')
  const isPending = createService.isPending || updateService.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [selectedProducts, setSelectedProducts] = useState<ServiceProductItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [productsEnabled, setProductsEnabled] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceForm>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(),
  })

  useEffect(() => {
    if (open) {
      if (service) {
        reset({
          name: service.name,
          description: service.description ?? '',
          durationMinutes: service.durationMinutes ?? '',
          price: service.price,
          categoryId: service.category?.id ?? null,
          isActive: service.isActive,
          costPrice: service.costPrice ?? null,
        })
        const activeServiceProducts = service.serviceProducts.filter((sp) =>
          allProducts.some((p) => p.id === sp.productId)
        )
        setSelectedProducts(activeServiceProducts)
        setProductsEnabled(activeServiceProducts.length > 0)
      } else {
        reset(buildDefaults())
        setSelectedProducts([])
        setProductsEnabled(false)
      }
      setSearchText('')
    }
  }, [open, service, reset])

  const filteredProducts = useMemo(() => {
    const active = allProducts.filter((p) => p.isActive)
    if (!searchText.trim()) return active
    const lower = searchText.toLowerCase()
    return active.filter((p) => p.name.toLowerCase().includes(lower))
  }, [allProducts, searchText])

  const suggestedPrice = calcSuggested(selectedProducts)

  const handleAddProduct = (product: Product) => {
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.productId === product.id)) return prev
      const next: ServiceProductItem[] = [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          purchasePrice: product.costPrice,
          price: product.price,
          quantity: 1,
        },
      ]
      setValue('costPrice', calcSuggested(next) || null)
      return next
    })
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = prev.filter((p) => p.productId !== productId)
      setValue('costPrice', calcSuggested(next) || null)
      return next
    })
  }

  const handleIncreaseQty = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = prev.map((p) =>
        p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p
      )
      setValue('costPrice', calcSuggested(next) || null)
      return next
    })
  }

  const handleProductsToggle = (enabled: boolean) => {
    setProductsEnabled(enabled)
    if (!enabled && selectedProducts.length > 0) {
      setSelectedProducts([])
      setValue('costPrice', null)
    }
  }

  const handleDecreaseQty = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = prev.map((p) =>
        p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p
      )
      setValue('costPrice', calcSuggested(next) || null)
      return next
    })
  }

  const onSubmit = async (data: ServiceForm) => {
    const durationMinutesVal = typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined
    const categoryId = data.categoryId || null
    const costPrice = data.costPrice && data.costPrice > 0 ? data.costPrice : null
    const products = selectedProducts.map((p) => ({ productId: p.productId, quantity: p.quantity }))

    if (isEditing) {
      await updateService.mutateAsync({
        id: service.id,
        name: data.name,
        description: data.description || undefined,
        durationMinutes: durationMinutesVal,
        price: data.price,
        categoryId,
        isActive: data.isActive,
        costPrice,
        products,
      })
    } else {
      await createService.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        durationMinutes: durationMinutesVal,
        price: data.price,
        categoryId,
        isActive: data.isActive ?? true,
        costPrice,
        products,
      })
    }
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={isEditing ? 'Editar serviço' : 'Novo serviço'}
        subtitle={
          isEditing
            ? 'Edite as informações do serviço'
            : 'Cadastre um serviço oferecido pelo seu negócio'
        }
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          component="form"
          id="service-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          {/* Nome */}
          <Box>
            <FieldLabel label="Nome do serviço" required />
            <TextField
              {...register('name')}
              fullWidth
              size="small"
              placeholder="Ex: Corte de cabelo masculino"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Box>

          {/* Descrição */}
          <Box>
            <FieldLabel label="Descrição" />
            <TextField
              {...register('description')}
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Descreva brevemente o serviço (opcional)"
              slotProps={{ input: { sx: { maxHeight: 280, overflowY: 'auto' } } }}
              error={!!errors.description}
              helperText={errors.description?.message as string}
            />
          </Box>

          {/* Preço + Duração */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Preço" required />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    value={Number(field.value) || 0}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    fullWidth
                    size="small"
                    error={!!errors.price}
                    helperText={errors.price?.message}
                  />
                )}
              />
            </Box>
            {/* Preço de custo */}
          <Box>
            <FieldLabel label="Preço de custo" required={requireCostPrice} />
            <Controller
              name="costPrice"
              control={control}
              render={({ field }) => (
                <CurrencyField
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  fullWidth
                  size="small"
                  error={!!errors.costPrice}
                  helperText={
                    errors.costPrice?.message ??
                    (showProductsSection && selectedProducts.length > 0
                      ? 'Calculado automaticamente pelos produtos selecionados'
                      : undefined)
                  }
                />
              )}
            />
          </Box>

            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Duração (minutos)" />
              <TextField
                {...register('durationMinutes')}
                fullWidth
                size="small"
                type="number"
                placeholder="Ex: 60"
                error={!!errors.durationMinutes}
                helperText={errors.durationMinutes?.message as string}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1, step: 1 },
                }}
              />
            </Box>
          </Box>

          {/* Categoria */}
          <Box>
            <FieldLabel label="Categoria" />
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <ChipSelect
                  options={categories.map((cat) => ({ id: cat.id, label: cat.name, color: cat.color }))}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  loading={isLoadingCategories}
                  emptyMessage="Nenhuma categoria cadastrada. Adicione na tela de serviços."
                  size="large"
                  colorMode="fill"
                  nullable
                />
              )}
            />
          </Box>

          {/* Produtos utilizados */}
          {showProductsSection && (
            hasLinkedProducts ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                bgcolor: 'surface.sunken',
                borderColor: 'border.strong',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory2Rounded sx={{ mx: 2, fontSize: 18, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Produtos utilizados
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Associe produtos consumidos na execução deste serviço.
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={productsEnabled}
                  onChange={(e) => handleProductsToggle(e.target.checked)}
                />
              </Box>

              <Collapse in={productsEnabled}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar produto..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Box sx={{ height: 320 }}>
                    <DataGrid
                      rows={filteredProducts}
                      columns={PRODUCT_COLUMNS}
                      rowHeight={52}
                      loading={isLoadingProducts}
                      pageSizeOptions={[15]}
                      initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
                      onRowClick={({ row }) => handleAddProduct(row as Product)}
                      slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
                      disableRowSelectionOnClick
                      sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
                    />
                  </Box>

                  {selectedProducts.length > 0 && (
                    <Box
                      sx={{
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'border.strong',
                        px: 2,
                        py: 2,
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {selectedProducts.map((item) => (
                          <Box
                            key={item.productId}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 0.5,
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ flex: 1 }}
                            >
                              {item.productName}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleDecreaseQty(item.productId)}
                                disabled={isPending}
                                sx={{ p: 0.25 }}
                              >
                                <RemoveRounded sx={{ fontSize: 16 }} />
                              </IconButton>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}
                              >
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleIncreaseQty(item.productId)}
                                disabled={isPending}
                                sx={{ p: 0.25 }}
                              >
                                <AddRounded sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>

                            <IconButton
                              size="small"
                              onClick={() => handleRemoveProduct(item.productId)}
                              disabled={isPending}
                              sx={{ p: 0.25 }}
                            >
                              <CloseRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          pt: 1,
                          mt: 1,
                          borderTop: '1px solid',
                          borderColor: 'border.subtle',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Preço sugerido
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatBRL(suggestedPrice)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
            ) : (
              <UpsellFeatureRow
                title="Produtos utilizados"
                description="Associe produtos consumidos na execução deste serviço com o plano Pro."
                modalTitle="Vincular produtos no Pro"
                modalDescription="Associar produtos consumidos a um serviço é um recurso do plano Pro. Faça upgrade para usá-lo."
              />
            )
          )}
        </Box>
      </DialogContent>

      <FormModalActions
        formId="service-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Dialog>
  )
}
