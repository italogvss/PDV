import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  InputAdornment,
  Skeleton,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded'
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { formatBRL } from '../../../../utils/currency'
import { useCreateProduct, useUpdateProduct } from '../../../../hooks/useProducts'
import { useProductCategories } from '../../../../hooks/useProductCategories'
import { useUploadImage, useRemoveImage } from '../../../../hooks/useMediaUpload'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'
import ImageUpload from '../../../../components/ImageUpload'
import type { ProductModalProps } from './types'

const PRODUCTS_QUERY_KEY = ['products'] as const

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  costPrice: z.number().positive('Deve ser maior que zero'),
  price: z.number().positive('Deve ser maior que zero'),
  stock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(0, 'Não pode ser negativo'),
  minStock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(0)
    .optional()
    .or(z.literal('')),
  criticalStock: z.coerce
    .number({ invalid_type_error: 'Informe um número' })
    .int()
    .min(0)
    .optional()
    .or(z.literal('')),
  barcode: z.string().optional(),
  categoryId: z.string().optional().nullable(),
})

type ProductForm = z.infer<typeof schema>

function buildDefaults(): ProductForm {
  return {
    name: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    minStock: '',
    criticalStock: '',
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
        reset(buildDefaults())
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

  const onSubmit = async (data: ProductForm) => {
    const minStockVal = typeof data.minStock === 'number' ? data.minStock : undefined
    const criticalStockVal = typeof data.criticalStock === 'number' ? data.criticalStock : undefined
    const categoryId = data.categoryId || null

    let entityId: string
    if (isEditing) {
      const updated = await updateProduct.mutateAsync({
        id: product.id,
        name: data.name,
        barcode: data.barcode || undefined,
        price: data.price,
        purchasePrice: data.costPrice,
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
        purchasePrice: data.costPrice,
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

    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
                    <FieldLabel label="Estoque atual" required={!isEditing} inline />
                  </Box>
                  <TextField
                    {...register('stock')}
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="0"
                    disabled={isEditing}
                    error={!!errors.stock}
                    helperText={
                      isEditing
                        ? 'Use "Ajustar estoque" para alterar'
                        : errors.stock?.message
                    }
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                </Box>

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
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Preços + margem */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <FieldLabel label="Preço de custo" required inline />
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <FieldLabel label="Código de barras" inline />
              <Typography variant="caption" color="text.disabled">EAN-13 ou SKU</Typography>
            </Box>
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
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => setValue('barcode', generateEAN13())}
                        startIcon={<AutoFixHighRounded sx={{ fontSize: 13 }} />}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 12 }}
                      >
                        Gerar
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Categoria */}
          <Box>
            <FieldLabel label="Categoria" />
            {isLoadingCategories ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" width={80} height={28} />
                ))}
              </Box>
            ) : (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {categories.length === 0 && (
                      <Typography variant="caption" color="text.disabled">
                        Nenhuma categoria cadastrada. Adicione na tela de estoque.
                      </Typography>
                    )}
                    {categories.map((cat) => (
                      <Chip
                        key={cat.id}
                        label={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                            {cat.name}
                          </Box>
                        }
                        size="medium"
                        onClick={() => field.onChange(field.value === cat.id ? null : cat.id)}
                        variant={field.value === cat.id ? 'filled' : 'outlined'}
                        sx={
                          field.value === cat.id
                            ? {
                                cursor: 'pointer',
                                bgcolor: 'text.primary',
                                color: 'background.paper',
                                borderColor: 'text.primary',
                                fontWeight: 600,
                                '&:hover': { bgcolor: 'text.primary' },
                              }
                            : { cursor: 'pointer', borderColor: 'border.subtle', color: 'text.secondary' }
                        }
                      />
                    ))}
                  </Box>
                )}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="product-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Dialog>
  )
}
