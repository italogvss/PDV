import { CloseRounded, Help, HistoryOutlined, PersonAddAlt1Rounded, PersonRounded } from '@mui/icons-material'
import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { ALL_MODULES } from '../../constants/modules'
import { useProductCategories } from '../../hooks/useProductCategories'
import { useProducts } from '../../hooks/useProducts'
import { useCreateSale } from '../../hooks/useSales'
import { useServiceCategories } from '../../hooks/useServiceCategories'
import { useServices } from '../../hooks/useServices'
import { useTenantSettings } from '../../hooks/useTenantSettings'
import { useAppSelector } from '../../store'
import type { AppointmentServiceRef } from '../../types/appointment.types'
import type { Product } from '../../types/product.types'
import type { Service } from '../../types/service.types'
import { maskCPF } from '../../utils/masks'
import CartPanel from './components/CartPanel'
import { EnrichedCartLine } from './components/CartPanel/types'
import FinalizationModal from './components/FinalizationModal'
import ProductCatalog from './components/ProductCatalog'
import { CatalogMode, CategoryValue } from './components/ProductCatalog/types'
import SelectCustomerModal from './components/SelectCustomerModal'
import { CardType, CartLine, CustomerSelection, PaymentMethod } from './types'

function buildPaymentMethod(method: PaymentMethod, cardType: CardType): string {
  if (method === 'cash') return 'Cash'
  if (method === 'pix') return 'PIX'
  if (cardType === 'credit') return 'CreditCard'
  return 'DebitCard'
}

export default function SalesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catalogMode, setCatalogMode] = useState<CatalogMode>('products')
  const [category, setCategory] = useState<CategoryValue>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerSelection>({ type: 'none' })
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [installments, setInstallments] = useState(1)
  const [cashReceived, setCashReceived] = useState('')
  const [finalizationOpen, setFinalizationOpen] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: categories = [] } = useProductCategories()
  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: serviceCategories = [] } = useServiceCategories()
  const auth = useAppSelector((state) => state.auth)
  const createSale = useCreateSale()
  const { data: tenantSettings } = useTenantSettings()
  const allowDiscounts = tenantSettings?.operation.allowDiscounts ?? false
  const discountLimitPercent = tenantSettings?.operation.discountLimitPercent ?? 0
  const requireCustomerOnSale = tenantSettings?.operation.requireCustomerOnSale ?? false
  const customersModuleActive = (tenantSettings?.modules ?? ALL_MODULES).includes('customers')

  // Enquanto as configurações carregam, libera todos os métodos para não travar a venda.
  const payments = tenantSettings?.payments ?? {
    feesEnabled: false,
    pix: { enabled: true, fee: 0 },
    cardCredit: { enabled: true, fee: 0 },
    cardDebit: { enabled: true, fee: 0 },
    cash: { enabled: true, fee: 0 },
  }

  const customerProvided = requireCustomerOnSale
    ? customer.type === 'entity'
    : customer.type === 'entity' || (customer.type === 'cpf' && customer.document.trim().length > 0)
  const customerMissing = customersModuleActive && requireCustomerOnSale && !customerProvided

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 1000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => {
    const state = location.state as { appointmentServices?: AppointmentServiceRef[] } | null
    if (!state?.appointmentServices?.length) return
    setCart(
      state.appointmentServices.map((s) => ({
        type: 'service' as const,
        lineId: crypto.randomUUID(),
        serviceId: s.id,
        quantity: 1,
      })),
    )
    setCatalogMode('services')
    navigate('/vendas', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Garante que o método/tipo de cartão selecionado esteja habilitado nas configurações.
  useEffect(() => {
    const cardEnabled = payments.cardCredit.enabled || payments.cardDebit.enabled
    const isEnabled = (m: PaymentMethod) =>
      m === 'pix' ? payments.pix.enabled : m === 'cash' ? payments.cash.enabled : cardEnabled

    if (!isEnabled(method)) {
      const next = (['card', 'pix', 'cash'] as PaymentMethod[]).find(isEnabled)
      if (next) setMethod(next)
    }
    if (cardType === 'credit' && !payments.cardCredit.enabled && payments.cardDebit.enabled) {
      setCardType('debit')
    } else if (cardType === 'debit' && !payments.cardDebit.enabled && payments.cardCredit.enabled) {
      setCardType('credit')
    }
  }, [payments, method, cardType])

  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return products.filter((p: Product) => {
      const matchesCategory = category === 'all' || p.category?.id === category
      const matchesSearch = term === '' || p.name.toLowerCase().includes(term)
      return matchesCategory && matchesSearch && p.isActive && p.stock > 0
    })
  }, [debouncedSearch, category, products])

  const filteredServices = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return services.filter((s: Service) => {
      const matchesCategory = category === 'all' || s.category?.id === category
      const matchesSearch = term === '' || s.name.toLowerCase().includes(term)
      return matchesCategory && matchesSearch && s.isActive
    })
  }, [debouncedSearch, category, services])

  const cartLines: EnrichedCartLine[] = useMemo(
    () =>
      cart.flatMap((line): EnrichedCartLine[] => {
        if (line.type === 'product') {
          const product = products.find((p: Product) => p.id === line.productId)
          return product ? [{ ...line, product }] : []
        } else {
          const service = services.find((s: Service) => s.id === line.serviceId)
          return service ? [{ ...line, service }] : []
        }
      }),
    [cart, products, services],
  )

  const subtotal = useMemo(
    () =>
      cartLines.reduce((sum, l) => {
        const price = l.type === 'product' ? l.product.price : l.service.price
        return sum + price * l.quantity
      }, 0),
    [cartLines],
  )

  const handleAdd = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId)
    if (!product) return

    setCart((prev) => {
      const existing = prev.find((l) => l.type === 'product' && l.productId === productId)
      const currentQty = existing?.quantity ?? 0
      if (currentQty >= product.stock) return prev

      if (existing) {
        return prev.map((l) =>
          l.type === 'product' && l.productId === productId
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        )
      }
      return [...prev, { type: 'product', productId, quantity: 1 }]
    })
  }

  const handleAddService = (serviceId: string) => {
    setCart((prev) => [
      ...prev,
      { type: 'service', lineId: crypto.randomUUID(), serviceId, quantity: 1 },
    ])
  }

  const handleModeChange = (mode: CatalogMode) => {
    setCatalogMode(mode)
    setCategory('all')
  }

  const handleDecrement = (productId: string) => {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.type !== 'product' || l.productId !== productId) return [l]
        if (l.quantity <= 1) return []
        return [{ ...l, quantity: l.quantity - 1 }]
      }),
    )
  }

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) =>
      prev.filter((l) => {
        if (l.type === 'product') return l.productId !== id
        return l.lineId !== id
      }),
    )
  }

  const handleFinalize = async () => {
    if (cart.length === 0) return

    const clampedDiscount = Math.min(discountAmount, subtotal)
    const paymentMethod = buildPaymentMethod(method, cardType)
    const isInstallment = method === 'card' && cardType === 'credit' && installments > 1
    const total = Math.max(0, subtotal - clampedDiscount)
    const receivedNumber = Number(cashReceived.replace(',', '.'))
    const amountPaid =
      method === 'cash' && !Number.isNaN(receivedNumber) && cashReceived.trim() !== ''
        ? receivedNumber
        : total

    await createSale.mutateAsync({
      customerId: customer.type === 'entity' ? customer.id : undefined,
      customerDocument: customer.type === 'cpf' ? customer.document : undefined,
      paymentMethod,
      isInstallment,
      installmentCount: isInstallment ? installments : undefined,
      amountPaid,
      discount: clampedDiscount,
      items: cart.map((l) => ({
        productId: l.type === 'product' ? l.productId : undefined,
        serviceId: l.type === 'service' ? l.serviceId : undefined,
        quantity: l.quantity,
      })),
    })

    setFinalizationOpen(false)
    setCart([])
    setCustomer({ type: 'none' })
    setCashReceived('')
    setMethod('card')
    setCardType('credit')
    setInstallments(1)
    setDiscountAmount(0)
  }

  const handleRestart = () => {
    setCart([])
    setCustomer({ type: 'none' })
    setCashReceived('')
    setMethod('card')
    setCardType('credit')
    setInstallments(1)
    setDiscountAmount(0)
    setFinalizationOpen(false)
  }

  return (
    <Box
      sx={{
        height: { md: '100%' },
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <PageHeader title="Vender" description={`Operador: ${auth.name}`} showHelp={false}>
        {customersModuleActive && (
          customer.type === 'entity' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'secondary.main',
                height: 36,
                maxWidth: 220,
              }}
            >
              <PersonRounded sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main', flex: 1 }} noWrap>
                {customer.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setCustomer({ type: 'none' })}
                sx={{ p: 0.25, color: 'error.ink', flexShrink: 0 }}
              >
                <CloseRounded sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ) : (
            <>
            <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAddAlt1Rounded />}
                onClick={() => setCustomerModalOpen(true)}
              >
                Adicionar cliente
              </Button>
              <TextField
                placeholder={requireCustomerOnSale ? 'CPF *' : 'CPF (opcional)'}
                size="small"
                value={customer.type === 'cpf' ? customer.document : ''}
                onChange={(e) => {
                  const val = maskCPF(e.target.value)
                  setCustomer(val ? { type: 'cpf', document: val } : { type: 'none' })
                }}
                sx={{ width: 160 }}
                slotProps={{ htmlInput: { maxLength: 14 } }}
              />
              
            </>
          )
        )}
        <Button variant="outlined" startIcon={<HistoryOutlined />} onClick={() => navigate('/historico')}>
          Histórico
        </Button>
        <Button variant="outlined" startIcon={<Help />} onClick={() => navigate("/ajuda")}>
          Ajuda
        </Button>
      </PageHeader>

      <Box
        sx={{
          flex: { md: 1 },
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 380px' },
          gap: 4,
        }}
      >
        <ProductCatalog
          mode={catalogMode}
          onModeChange={handleModeChange}
          products={filteredProducts}
          productCategories={categories}
          services={filteredServices}
          serviceCategories={serviceCategories}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          onAddProduct={handleAdd}
          onAddService={handleAddService}
          isLoading={catalogMode === 'products' ? loadingProducts : loadingServices}
        />
        <CartPanel
          onRestart={handleRestart}
          lines={cartLines}
          subtotal={subtotal}
          onIncrement={handleAdd}
          onDecrement={handleDecrement}
          onRemove={handleRemoveFromCart}
          onFinalize={() => setFinalizationOpen(true)}
          customerMissing={customerMissing}
          discountAmount={discountAmount}
          onDiscountChange={setDiscountAmount}
          allowDiscounts={allowDiscounts}
          discountLimitPercent={discountLimitPercent}
          method={method}
          onMethodChange={setMethod}
          cardType={cardType}
          onCardTypeChange={setCardType}
          installments={installments}
          onInstallmentsChange={setInstallments}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          payments={payments}
        />
      </Box>

      <FinalizationModal
        open={finalizationOpen}
        onClose={() => setFinalizationOpen(false)}
        lines={cartLines}
        subtotal={subtotal}
        discountAmount={discountAmount}
        customer={customer}
        method={method}
        cardType={cardType}
        installments={installments}
        onFinalize={handleFinalize}
        isSubmitting={createSale.isPending}
      />

      <SelectCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(c) => setCustomer({ type: 'entity', ...c })}
      />
    </Box>
  )
}
