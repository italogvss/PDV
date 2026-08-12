import { CloseRounded, Help, HistoryOutlined, PersonAddAlt1Rounded, PersonRounded } from '@mui/icons-material'
import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useProductCategories } from '../../hooks/useProductCategories'
import { useProducts } from '../../hooks/useProducts'
import { useCreateSale } from '../../hooks/useSales'
import { useServiceCategories } from '../../hooks/useServiceCategories'
import { useServices } from '../../hooks/useServices'
import { usePdvSettings } from '../../hooks/useTenantSettings'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import { useAppSelector } from '../../store'
import type { AppointmentServiceRef } from '../../types/appointment.types'
import type { Product } from '../../types/product.types'
import type { SaleDetail } from '../../types/sale.types'
import type { Service } from '../../types/service.types'
import { maskCPF } from '../../utils/masks'
import CartPanel from './components/CartPanel'
import { EnrichedCartLine } from './components/CartPanel/types'
import FinalizationModal from './components/FinalizationModal'
import type { FinalizationResult } from './components/FinalizationModal/types'
import ProductCatalog from './components/ProductCatalog'
import { CatalogMode, CategoryValue } from './components/ProductCatalog/types'
import SelectCustomerModal from './components/SelectCustomerModal'
import { CartLine, CustomerSelection } from './types'

/**
 * A página monta a venda (catálogo + carrinho + cliente). Tudo que é DECISÃO sobre a venda —
 * desconto, forma de pagamento, parcelamento e crediário — vive na modal de finalização.
 */
export default function SalesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catalogMode, setCatalogMode] = useState<CatalogMode>('products')
  const [category, setCategory] = useState<CategoryValue>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerSelection>({ type: 'none' })
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [finalizationOpen, setFinalizationOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: categories = [] } = useProductCategories()
  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: serviceCategories = [] } = useServiceCategories()
  const auth = useAppSelector((state) => state.auth)
  const createSale = useCreateSale()
  const { isModuleEnabled } = useUserPermissions()
  const { data: tenantSettings } = usePdvSettings()
  const requireCustomerOnSale = tenantSettings?.operation.requireCustomerOnSale ?? false
  const customersModuleActive = isModuleEnabled('customers')

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
    const state = location.state as {
      appointmentServices?: AppointmentServiceRef[]
      appointmentCustomerId?: string
      appointmentCustomerName?: string
    } | null
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
    if (state.appointmentCustomerId) {
      setCustomer({
        type: 'entity',
        id: state.appointmentCustomerId,
        name: state.appointmentCustomerName ?? '',
        document: null,
      })
    }
    navigate('/vendas', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // A venda criada é devolvida à modal: é ela que alimenta o comprovante imprimível.
  const handleFinalize = async (result: FinalizationResult): Promise<SaleDetail | undefined> => {
    if (cart.length === 0) return undefined

    return createSale.mutateAsync({
      ...result,
      items: cart.map((l) => ({
        productId: l.type === 'product' ? l.productId : undefined,
        serviceId: l.type === 'service' ? l.serviceId : undefined,
        quantity: l.quantity,
      })),
    })
  }

  const handleRestart = () => {
    setCart([])
    setCustomer({ type: 'none' })
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
                variant="contained"
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
        <Button variant="outlined" startIcon={<Help />} onClick={() => navigate("/ajuda?cat=vendas&art=registrar-venda")}>
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
        />
      </Box>

      <FinalizationModal
        open={finalizationOpen}
        onClose={() => setFinalizationOpen(false)}
        lines={cartLines}
        subtotal={subtotal}
        customer={customer}
        onCustomerChange={setCustomer}
        onOpenCustomerModal={() => setCustomerModalOpen(true)}
        onFinalize={handleFinalize}
        isSubmitting={createSale.isPending}
        onNewSale={handleRestart}
      />

      <SelectCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(c) => setCustomer({ type: 'entity', ...c })}
      />
    </Box>
  )
}
