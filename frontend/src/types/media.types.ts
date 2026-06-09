export type MediaCategory = 'Profile' | 'Product' | 'Service' | 'Tenant'

export interface PresignedUrlResponse {
  uploadUrl: string
  relativePath: string
}
