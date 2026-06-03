import type { Service } from '../../../../types/service.types'

export interface ServiceCardProps {
  service: Service
  onAdd: (serviceId: string) => void
}
