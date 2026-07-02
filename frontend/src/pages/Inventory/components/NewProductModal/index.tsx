import { zodResolver } from '@hookform/resolvers/zod'
import AddRounded from '@mui/icons-material/AddRounded'
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded'
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ImageUpload from '../../../../components/ImageUpload'
import ModalHeader from '../../../../components/ModalHeader'
import PremiumLock from '../../../../components/PremiumLock'
import { FEATURES } from '../../../../constants/entitlements'
import { useRemoveImage, useUploadImage } from '../../../../hooks/useMediaUpload'
import { useProductCategories } from '../../../../hooks/useProductCategories'
import { useCreateProduct, useUpdateProduct } from '../../../../hooks/useProducts'
import { useEntitlements } from '../../../../hooks/useSubscription'
import { useInventorySettings } from '../../../../hooks/useTenantSettings'
import { formatBRL } from '../../../../utils/currency'
import type { ProductModalProps } from './types'

const PRODUCTS_QUERY_KEY = ['products'] as const

const _baseProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  costPrice: z.number().min(0),
  price: z.number().positive('Deve ser maior que zero'),
  stock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .max(9999)
    .min(0, 'Não pode ser negativo'),
  minStock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(0)
    .max(9999)
    .optional()
    .or(z.literal('')),
  criticalStock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(0)
    .max(9999)
    .optional()
    .or(z.literal('')),
  barcode: z.string().max(50, 'Código de barras deve ter no máximo 50 caracteres').optional(),
  categoryId: z.string().optional().nullable(),
})

type ProductForm = z.infer<typeof _baseProductSchema>

function buildProductSchema(requireCostPrice: boolean) {
  return _baseProductSchema.superRefine((data, ctx) => {
    const min = typeof data.minStock === 'number' ? data.minStock : undefined
    const critical = typeof data.criticalStock === 'number' ? data.criticalStock : undefined
    if (min !== undefined && critical !== undefined && critical > min) {
      ctx.addIssue({ code: 'custom', message: 'Deve ser menor ou igual ao estoque mínimo', path: ['criticalStock'] })
    }
    if (requireCostPrice && data.costPrice <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Deve ser maior que zero', path: ['costPrice'] })
    }
  })
}

function buildDefaults(stockDefaults?: { minStock?: number; criticalStock?: number }): ProductForm {
  return {
    name: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    minStock: stockDefaults?.minStock ?? '',
    criticalStock: stockDefaults?.criticalStock ?? '',
    barcode: '',
    categoryId: null,
  }
}

function generateEAN13(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  return [...digits, check].join('')
}

export default function ProductModal({ open, onClose, product }: ProductModalProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isEditing = !!product
  const { has } = useEntitlements()
  const hasAdvancedInventory = has(FEATURES.advancedInventory)
  const { data: inventorySettings } = useInventorySettings()
  const requireCostPrice = inventorySettings?.requireCostPriceOnProducts ?? true
  const schema = useMemo(() => buildProductSchema(requireCostPrice), [requireCostPrice])
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const uploadImage = useUploadImage('Product', PRODUCTS_QUERY_KEY)
  const removeImage = useRemoveImage('Product', PRODUCTS_QUERY_KEY)
  const { data: categories = [], isLoading: isLoadingCategories } = useProductCategories()
  const isPending =
    createProduct.isPending ||
    updateProduct.isPending ||
    uploadImage.isPending ||
    removeImage.isPending

  // Imagem: no cadastro o upload é adiado até o produto existir (precisa do id).
  // Guardamos o arquivo escolhido + um preview local; o PUT acontece no submit.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [removeExisting, setRemoveExisting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(),
  })

  const watchCostPrice = watch('costPrice')
  const watchPrice = watch('price')

  const showProfit = Number(watchCostPrice) > 0 && Number(watchPrice) > 0
  const profitPerUnit = showProfit ? Number(watchPrice) - Number(watchCostPrice) : 0
  const marginPercent =
    showProfit && Number(watchCostPrice) > 0
      ? (profitPerUnit / Number(watchCostPrice)) * 100
      : 0
  const isPositiveMargin = profitPerUnit >= 0

  const stockFieldsDisabled =
    !!inventorySettings?.inventoryControlEnabled && !inventorySettings?.stockFieldsEditable

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name: product.name,
          costPrice: product.costPrice,
          price: product.price,
          stock: product.stock,
          minStock: product.minStock ?? '',
          criticalStock: product.criticalStock ?? '',
          barcode: product.barcode ?? '',
          categoryId: product.category?.id ?? null,
        })
      } else {
        // Defaults de estoque mín/crítico são um recurso do plano — sem a feature, não pré-preenche.
        const ctrl = hasAdvancedInventory && inventorySettings?.inventoryControlEnabled
        reset(buildDefaults(ctrl ? {
          minStock: inventorySettings?.defaultMinStock,
          criticalStock: inventorySettings?.defaultCriticalStock,
        } : undefined))
      }
      setSelectedFile(null)
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setRemoveExisting(false)
    }
  }, [open, product, reset])

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
    setRemoveExisting(false)
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    // No modo edição, marca para remover a imagem já existente ao salvar.
    if (isEditing) setRemoveExisting(true)
  }

  // Preview: arquivo recém-escolhido > imagem atual do produto (salvo p/ remoção).
  const currentImageUrl =
    localPreview ?? (removeExisting ? null : product?.imageUrl ?? null)

  const [isSavingAndNew, setIsSavingAndNew] = useState(false)
  const saveModeRef = useRef<'save' | 'saveAndNew'>('save')

  const onSubmit = async (data: ProductForm) => {
    const mode = saveModeRef.current
    if (mode === 'saveAndNew') setIsSavingAndNew(true)
    try {
      const minStockVal = typeof data.minStock === 'number' ? data.minStock : undefined
      const criticalStockVal = typeof data.criticalStock === 'number' ? data.criticalStock : undefined
      const categoryId = data.categoryId || null

      const purchasePrice = data.costPrice > 0 ? data.costPrice : undefined

      let entityId: string
      if (isEditing) {
        const updated = await updateProduct.mutateAsync({
          id: product.id,
          name: data.name,
          barcode: data.barcode || undefined,
          price: data.price,
          purchasePrice,
          stock: data.stock,
          minStock: minStockVal,
          minCriticalStock: criticalStockVal,
          categoryId,
        })
        entityId = updated.id
      } else {
        const created = await createProduct.mutateAsync({
          name: data.name,
          barcode: data.barcode || undefined,
          price: data.price,
          purchasePrice,
          stock: data.stock,
          minStock: minStockVal,
          minCriticalStock: criticalStockVal,
          categoryId,
        })
        entityId = created.id
      }

      // Produto salvo. Trata a imagem (erro aqui não bloqueia o fechamento — já há toast próprio).
      try {
        if (selectedFile) {
          await uploadImage.mutateAsync({ file: selectedFile, entityId })
        } else if (isEditing && removeExisting && product?.imageUrl) {
          await removeImage.mutateAsync(entityId)
        }
      } catch {
        /* o hook de mídia já exibiu o toast de erro */
      }

      if (mode === 'saveAndNew') {
        const ctrl = hasAdvancedInventory && inventorySettings?.inventoryControlEnabled
        reset(buildDefaults(ctrl ? {
          minStock: inventorySettings?.defaultMinStock,
          criticalStock: inventorySettings?.defaultCriticalStock,
        } : undefined))
        setSelectedFile(null)
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setRemoveExisting(false)
      } else {
        onClose()
      }
    } finally {
      saveModeRef.current = 'save'
      if (mode === 'saveAndNew') setIsSavingAndNew(false)
    }
  }

  const handleSaveAndNew = () => {
    saveModeRef.current = 'saveAndNew'
    handleSubmit(onSubmit)()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={isEditing ? 'Editar produto' : 'Novo produto'}
        subtitle={
          isEditing
            ? 'Edite as informações do produto'
            : 'Cadastre um item para começar a vender no PDV'
        }
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          component="form"
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          {/* Desktop: foto à esquerda; Nome + Estoque à direita (foto acompanha a altura).
              Mobile: tudo em coluna (foto, nome, estoques). */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            {/* Imagem do produto */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FieldLabel label="Foto do produto" />
              <Box sx={{ mt: 0.5, flex: 1 }}>
                <PremiumLock
                  feature={FEATURES.productWithPhoto}
                  title="Fotos de produto no Pro"
                  description="Adicionar foto aos produtos é um recurso do plano Pro. Faça upgrade para destacar seu catálogo."
                >
                  <ImageUpload
                    currentUrl={currentImageUrl}
                    onUpload={handleImageSelect}
                    onRemove={handleRemoveImage}
                    isLoading={uploadImage.isPending || removeImage.isPending}
                    disabled={isPending}
                    shape="square"
                    size={120}
                    fullHeight={!isMobile}
                  />
                </PremiumLock>
              </Box>
            </Box>

            {/* Nome + Estoque */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <FieldLabel label="Nome do produto" required />
                <TextField
                  {...register('name')}
                  fullWidth
                  size="small"
                  placeholder="Ex: Café espresso 50g"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <FieldLabel label="Estoque atual" required inline />
                  </Box>
                  <TextField
                    {...register('stock')}
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="0"
                    error={!!errors.stock}
                    helperText={errors.stock?.message}
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                </Box>

                <Box sx={{ flex: 2, minWidth: 0 }}>
                  <PremiumLock
                    feature={FEATURES.advancedInventory}
                    radius={1}
                    title="Controle de estoque no Pro"
                    description="Definir estoque mínimo e crítico é um recurso do plano Pro. Faça upgrade para receber alertas de reposição."
                  >
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <FieldLabel label="Estoque mínimo" inline />
                        </Box>
                        <TextField
                          {...register('minStock')}
                          fullWidth
                          size="small"
                          type="number"
                          placeholder="Ex: 10"
                          error={!!errors.minStock}
                          helperText={errors.minStock?.message as string}
                          disabled={isPending || stockFieldsDisabled}
                          slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <FieldLabel label="Estoque crítico" inline />
                        </Box>
                        <TextField
                          {...register('criticalStock')}
                          fullWidth
                          size="small"
                          type="number"
                          placeholder="Ex: 3"
                          error={!!errors.criticalStock}
                          helperText={errors.criticalStock?.message as string}
                          disabled={isPending || stockFieldsDisabled}
                          slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        />
                      </Box>
                    </Box>
                  </PremiumLock>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Preços + margem */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <FieldLabel label="Preço de custo" required={requireCostPrice} inline />
                  <Typography variant="caption" color="text.disabled">unitário</Typography>
                </Box>
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
                      helperText={errors.costPrice?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <FieldLabel label="Preço de venda" required inline />
                  <Typography variant="caption" color="text.disabled">no negócio</Typography>
                </Box>
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
            </Box>

            {showProfit && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 1,
                    borderRadius: '10px',
                    bgcolor: isPositiveMargin ? 'success.soft' : 'error.soft',
                  }}
                >
                  {isPositiveMargin ? (
                    <TrendingUpRounded sx={{ fontSize: 15, color: 'success.main' }} />
                  ) : (
                    <TrendingDownRounded sx={{ fontSize: 15, color: 'error.main' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: isPositiveMargin ? 'success.ink' : 'error.ink' }}
                  >
                    Margem {isPositiveMargin ? '+' : ''}{marginPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Lucro por unidade: <strong>{formatBRL(profitPerUnit)}</strong>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Código de barras */}
          <Box>
            <FieldLabel label="Código de barras" inline />
            <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 2}}>
            <TextField
              {...register('barcode')}
              fullWidth
              size="small"
              placeholder="Bipe o produto ou digite o código"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">

                    </InputAdornment>
                  ),
                },
              }}
            />
            
            <Button
              size="small"
              variant="outlined"
              onClick={() => setValue('barcode', generateEAN13())}
              startIcon={<AutoFixHighRounded sx={{ fontSize: 13 }} />}>
              Gerar
            </Button>
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
                  emptyMessage="Nenhuma categoria cadastrada. Adicione na tela de estoque."
                  size="large"
                  colorMode="fill"
                  nullable
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="product-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
        extraActions={
          !isEditing ? (
            <Button
              variant="contained"
              disabled={isPending}
              onClick={handleSaveAndNew}
              startIcon={
                isSavingAndNew
                  ? <CircularProgress size={14} color="inherit" />
                  : <AddRounded />
              }
            >
              Salvar e Novo
            </Button>
          ) : undefined
        }
      />
    </Dialog>
  )
}
