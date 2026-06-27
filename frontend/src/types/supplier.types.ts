export interface SupplierAddress {
  street: string | null
  number: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export interface CreateSupplierPayload {
  name: string
  phone: string | null
  email: string | null
  document: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
}

export type UpdateSupplierPayload = CreateSupplierPayload

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  address: SupplierAddress | null
  createdAt: string
}
