export interface CreateSupplierPayload {
  name: string
  phone: string | null
}

export type UpdateSupplierPayload = CreateSupplierPayload

export interface Supplier {
  id: string
  name: string
  phone: string | null
  createdAt: string
}
