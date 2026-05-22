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
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import QrCodeScannerRounded from '@mui/icons-material/QrCodeScannerRounded'
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useRef } from 'react'
import type { TextFieldProps } from '@mui/material'
import { PRODUCT_CATEGORIES } from '../../../../types/product.types'
import { formatBRL } from '../../../../utils/currency'
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
  barcode: z.string().optional(),
  category: z.string().optional(),
})

type ProductForm = z.infer<typeof schema>

const emptyDefaults: ProductForm = {
  name: '',
  costPrice: 0,
  price: 0,
  stock: 0,
  minStock: '',
  barcode: '',
  category: '',
}

function generateEAN13(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  return [...digits, check].join('')
}

// ─── Máscara de moeda BRL ─────────────────────────────────────────────────────

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
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const newCatInputRef = useRef<HTMLInputElement>(null)

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
    defaultValues: emptyDefaults,
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
      setExtraCategories([])
      setShowNewCatInput(false)
      setNewCatValue('')
      if (product) {
        const isExtra = !PRODUCT_CATEGORIES.includes(product.category as never)
        setExtraCategories(isExtra && product.category ? [product.category.name] : [])
        reset({
          name: product.name,
          costPrice: product.costPrice,
          price: product.price,
          stock: product.stock,
          minStock: product.minStock ?? '',
          barcode: product.barcode ?? '',
          category: product.category?.name ?? '',
        })
      } else {
        reset(emptyDefaults)
      }
    }
  }, [open, product, reset])

  const allCategories = [...PRODUCT_CATEGORIES, ...extraCategories]

  const handleAddCategory = (fieldOnChange: (v: string) => void) => {
    const trimmed = newCatValue.trim()
    if (!trimmed) {
      setShowNewCatInput(false)
      return
    }
    if (!allCategories.includes(trimmed)) {
      setExtraCategories((prev) => [...prev, trimmed])
    }
    fieldOnChange(trimmed)
    setShowNewCatInput(false)
    setNewCatValue('')
  }

  const handleGenerateBarcode = () => {
    setValue('barcode', generateEAN13())
  }

  const onSubmit = async (data: ProductForm) => {
    // TODO: integrar com productsService.create / productsService.update
    await new Promise<void>((resolve) => setTimeout(resolve, 800))
    console.log(isEditing ? 'Produto atualizado:' : 'Novo produto:', data)
    onClose()
  }

  const handleClose = () => {
    if (isSubmitting) return
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
          <IconButton
            size="small"
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ mt: -0.5, mr: -0.5 }}
          >
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
              {/* Valor de compra */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <FieldLabel label="Valor de compra" required inline />
                  <Typography variant="caption" color="text.disabled">
                    custo unitário
                  </Typography>
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

              {/* Preço de venda */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <FieldLabel label="Preço de venda" required inline />
                  <Typography variant="caption" color="text.disabled">
                    no PDV
                  </Typography>
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

            {/* Margem de lucro */}
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
                    sx={{
                      fontWeight: 600,
                      color: isPositiveMargin ? 'success.ink' : 'error.ink',
                    }}
                  >
                    Margem de lucro {isPositiveMargin ? '+' : ''}
                    {marginPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Lucro por unidade:{' '}
                  <strong>{formatBRL(profitPerUnit)}</strong>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Estoque */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <FieldLabel label="Estoque atual" required inline />
                <Typography variant="caption" color="text.disabled">
                  unidades
                </Typography>
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

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <FieldLabel label="Estoque mínimo" inline />
                <Typography variant="caption" color="text.disabled">
                  alerta de reposição
                </Typography>
              </Box>
              <TextField
                {...register('minStock')}
                fullWidth
                size="small"
                type="number"
                placeholder="Ex: 10"
                error={!!errors.minStock}
                helperText={errors.minStock?.message}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Box>
          </Box>

          {/* Código de barras */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <FieldLabel label="Código de barras" inline />
              <Typography variant="caption" color="text.disabled">
                EAN-13 ou SKU
              </Typography>
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
                        onClick={handleGenerateBarcode}
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
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {allCategories.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat}
                        size="small"
                        onClick={() => field.onChange(cat)}
                        color={field.value === cat ? 'success' : 'default'}
                        variant={field.value === cat ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}

                    {showNewCatInput ? (
                      <TextField
                        inputRef={newCatInputRef}
                        size="small"
                        value={newCatValue}
                        onChange={(e) => setNewCatValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCategory(field.onChange)
                          }
                          if (e.key === 'Escape') {
                            setShowNewCatInput(false)
                            setNewCatValue('')
                          }
                        }}
                        onBlur={() => handleAddCategory(field.onChange)}
                        autoFocus
                        placeholder="Nova categoria"
                        sx={{ width: 140 }}
                        slotProps={{
                          htmlInput: { style: { padding: '4px 8px', fontSize: 13 } },
                        }}
                      />
                    ) : (
                      <Chip
                        label="+ Nova"
                        size="small"
                        variant="outlined"
                        onClick={() => setShowNewCatInput(true)}
                        sx={{ cursor: 'pointer', borderStyle: 'dashed' }}
                        icon={<AddRounded sx={{ fontSize: '14px !important' }} />}
                      />
                    )}
                  </Box>
                </>
              )}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
          ✓ Os campos com * são obrigatórios
        </Typography>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="product-form"
          variant="contained"
          color="success"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CheckRounded />
            )
          }
        >
          {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar produto'}
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
