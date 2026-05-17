export type CustomerSegment = 'VIP' | 'Regular' | 'Novo' | 'Inativo'

export interface CustomerMetrics {
  totalCustomers: number
  newCustomersThisMonth: number
  activeCustomers: number
  activePercentage: number
  averageLTV: number
  vipCount: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  city: string
  segment: CustomerSegment
  totalSpent: number
  visits: number
  averageTicket: number
  lastPurchase: string
  joinedDate: string
  isVIP: boolean
  favoriteItem?: string
  notes?: string
}

export interface CustomerFilterOption {
  label: string
  value: CustomerSegment | 'all'
  count: number
}

export interface SortOption {
  label: string
  value: 'default' | 'spending' | 'visits' | 'recent' | 'name'
}
