import { useMemo, useState } from 'react'
import { Box } from '@mui/material'
import SalesHeader from './components/SalesHeader'
import ProductCatalog from './components/ProductCatalog'
import CartPanel from './components/CartPanel'
import { CartLineWithProduct } from './components/CartPanel/types'
import { CategoryValue } from './components/ProductCatalog/types'
import { CartLine, PaymentMethod } from './types'
import { DISCOUNT_RATE, PRODUCTS } from './data'

export default function SalesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryValue>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cashReceived, setCashReceived] = useState('')

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return PRODUCTS.filter((p) => {
      const matchesCategory = category === 'all' || p.category === category
      const matchesSearch = term === '' || p.name.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [search, category])

  const cartLines: CartLineWithProduct[] = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = PRODUCTS.find((p) => p.id === line.productId)
        return product ? [{ ...line, product }] : []
      }),
    [cart],
  )

  const subtotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cartLines],
  )
  const discount = subtotal * DISCOUNT_RATE
  const total = subtotal - discount

  const handleAdd = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const handleIncrement = (productId: string) => handleAdd(productId)

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

  const handleFinalize = () => {
    setCart([])
    setCashReceived('')
    setMethod('card')
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
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          onAddProduct={handleAdd}
        />
        <CartPanel
          lines={cartLines}
          subtotal={subtotal}
          discount={discount}
          total={total}
          method={method}
          onMethodChange={setMethod}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onFinalize={handleFinalize}
        />
      </Box>
    </Box>
  )
}
