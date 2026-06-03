import type { Service } from '../../../../types/service.types'

export interface ServiceCartItemProps {
  service: Service
  lineId: string
  onRemove: (lineId: string) => void
}
