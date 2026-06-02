import { useEffect, useMemo, useRef, useState } from 'react'
import { Box } from '@mui/material'
import SalesHeader from './components/SalesHeader'
import ProductCatalog from './components/ProductCatalog'
import CartPanel from './components/CartPanel'
import SelectCustomerModal from './components/SelectCustomerModal'
import { CartLineWithProduct } from './components/CartPanel/types'
import { CategoryValue } from './components/ProductCatalog/types'
import { CartLine, CardType, CustomerSelection, PaymentMethod } from './types'
import { useProducts } from '../../hooks/useProducts'
import { useProductCategories } from '../../hooks/useProductCategories'
import { useCreateSale } from '../../hooks/useSales'
import type { Product } from '../../types/product.types'

function buildPaymentMethod(method: PaymentMethod, cardType: CardType): string {
  if (method === 'cash') return 'Cash'
  if (method === 'pix') return 'PIX'
  if (cardType === 'credit') return 'Credit Card'
  return 'Debit Card'
}

export default function SalesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<CategoryValue>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerSelection>({ type: 'none' })
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [installments, setInstallments] = useState(1)
  const [cashReceived, setCashReceived] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: categories = [] } = useProductCategories()
  const createSale = useCreateSale()

  // Atualiza a busca com delay de 3 segundos
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 3000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return products.filter((p: Product) => {
      const matchesCategory = category === 'all' || p.category?.id === category
      const matchesSearch = term === '' || p.name.toLowerCase().includes(term)
      return matchesCategory && matchesSearch && p.isActive && p.stock > 0
    })
  }, [debouncedSearch, category, products])

  const cartLines: CartLineWithProduct[] = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = products.find((p: Product) => p.id === line.productId)
        return product ? [{ ...line, product }] : []
      }),
    [cart, products],
  )

  const subtotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cartLines],
  )

  const handleAdd = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId)
    if (!product) return

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      const currentQty = existing?.quantity ?? 0
      if (currentQty >= product.stock) return prev

      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const handleDecrement = (productId: string) => {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== productId) return [l]
        if (l.quantity <= 1) return []
        return [{ ...l, quantity: l.quantity - 1 }]
      }),
    )
  }

  const handleRemove = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId))
  }

  const handleFinalize = async () => {
    if (cart.length === 0) return

    const paymentMethod = buildPaymentMethod(method, cardType)
    const isInstallment = method === 'card' && cardType === 'credit' && installments > 1
    const receivedNumber = Number(cashReceived.replace(',', '.'))
    const amountPaid = method === 'cash' && !Number.isNaN(receivedNumber) && cashReceived.trim() !== ''
      ? receivedNumber
      : subtotal

    await createSale.mutateAsync({
      customerId: customer.type === 'entity' ? customer.id : undefined,
      customerDocument: customer.type === 'cpf' ? customer.document : undefined,
      paymentMethod,
      isInstallment,
      installmentCount: isInstallment ? installments : undefined,
      amountPaid,
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    })

    setCart([])
    setCustomer({ type: 'none' })
    setCashReceived('')
    setMethod('card')
    setCardType('credit')
    setInstallments(1)
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
      <SalesHeader />
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
          products={filteredProducts}
          categories={categories}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          onAddProduct={handleAdd}
          isLoading={loadingProducts}
        />
        <CartPanel
          lines={cartLines}
          subtotal={subtotal}
          total={subtotal}
          method={method}
          onMethodChange={setMethod}
          cardType={cardType}
          onCardTypeChange={setCardType}
          installments={installments}
          onInstallmentsChange={setInstallments}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          onIncrement={handleAdd}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onFinalize={handleFinalize}
          isSubmitting={createSale.isPending}
          customer={customer}
          onCustomerChange={setCustomer}
          onOpenCustomerModal={() => setCustomerModalOpen(true)}
        />
      </Box>
      <SelectCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(c) => setCustomer({ type: 'entity', ...c })}
      />
    </Box>
  )
}
