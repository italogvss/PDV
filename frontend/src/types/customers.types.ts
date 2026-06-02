export interface CustomerMetrics {
  total: number
  withPhone: number
  withEmail: number
  withDocument: number
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  note: string
  address: {
    street: string | null
    number: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  } | null
}
