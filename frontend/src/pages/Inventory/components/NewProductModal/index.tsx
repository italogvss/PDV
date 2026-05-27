import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Skeleton,
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded'
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded'
import AddPhotoAlternateRounded from '@mui/icons-material/AddPhotoAlternateRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useRef } from 'react'
import type { TextFieldProps } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import { useCreateProduct, useUpdateProduct } from '../../../../hooks/useProducts'
import { useProductCategories } from '../../../../hooks/useProductCategories'
import type { ProductModalProps } from './types'

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

// ─── CurrencyTextField ────────────────────────────────────────────────────────

function fmtCents(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface CurrencyTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: number
  onChange: (v: number) => void
}

function CurrencyTextField({ value, onChange, onBlur, ...rest }: CurrencyTextFieldProps) {
  const [display, setDisplay] = useState(() => fmtCents(value))

  useEffect(() => {
    setDisplay(fmtCents(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    const reals = cents / 100
    setDisplay(fmtCents(reals))
    onChange(reals)
  }

  return (
    <TextField
      {...rest}
      value={display}
      onChange={handleChange}
      onBlur={onBlur as TextFieldProps['onBlur']}
      onFocus={(e) => e.target.select()}
      slotProps={{
        ...rest.slotProps,
        input: {
          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          ...(rest.slotProps?.input as object),
        },
        htmlInput: { inputMode: 'numeric', ...(rest.slotProps?.htmlInput as object) },
      }}
    />
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ProductModal({ open, onClose, product }: ProductModalProps) {
  const isEditing = !!product
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { data: categories = [], isLoading: isLoadingCategories } = useProductCategories()
  const isPending = createProduct.isPending || updateProduct.isPending

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
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
      setImagePreview(null)
    }
  }, [open, product, reset])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: ProductForm) => {
    const minStockVal = typeof data.minStock === 'number' ? data.minStock : undefined
    const criticalStockVal = typeof data.criticalStock === 'number' ? data.criticalStock : undefined
    const categoryId = data.categoryId || null

    if (isEditing) {
      await updateProduct.mutateAsync({
        id: product.id,
        name: data.name,
        barcode: data.barcode || undefined,
        price: data.price,
        purchasePrice: data.costPrice,
        minStock: minStockVal,
        minCriticalStock: criticalStockVal,
        categoryId,
      })
    } else {
      await createProduct.mutateAsync({
        name: data.name,
        barcode: data.barcode || undefined,
        price: data.price,
        purchasePrice: data.costPrice,
        stock: data.stock,
        minStock: minStockVal,
        minCriticalStock: criticalStockVal,
        categoryId,
      })
    }
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {isEditing ? 'Editar produto' : 'Novo produto'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isEditing
                ? 'Edite as informações do produto'
                : 'Cadastre um item para começar a vender no PDV'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={isPending} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseRounded sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          component="form"
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
        >
          {/* Imagem do produto */}
          <Box>
            <FieldLabel label="Foto do produto" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageSelect}
            />
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                position: 'relative',
                height: 96,
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              {imagePreview ? (
                <>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      p: 0.25,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                    }}
                  >
                    <CloseRounded sx={{ fontSize: 14 }} />
                  </IconButton>
                </>
              ) : (
                <>
                  <AddPhotoAlternateRounded sx={{ fontSize: 28, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    Clique para adicionar foto
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {/* Nome */}
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
                    <CurrencyTextField
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
                    <CurrencyTextField
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

          {/* Estoque */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
                        color={field.value === cat.id ? 'success' : 'default'}
                        variant={field.value === cat.id ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
          ✓ Os campos com * são obrigatórios
        </Typography>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="product-form"
          variant="contained"
          color="success"
          disabled={isPending || isSubmitting}
          startIcon={
            isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CheckRounded />
            )
          }
        >
          {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar produto'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FieldLabelProps {
  label: string
  required?: boolean
  inline?: boolean
}

function FieldLabel({ label, required, inline }: FieldLabelProps) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 500,
        color: 'text.secondary',
        display: inline ? 'inline' : 'block',
        mb: inline ? 0 : 0.5,
      }}
    >
      {label}
      {required && (
        <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.25 }}>
          *
        </Typography>
      )}
    </Typography>
  )
}
