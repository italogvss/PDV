import type { BusinessSettings } from '../../types/settings.types'
import type { SaleDetail } from '../../types/sale.types'

export interface SaleReceiptProps {
  sale: SaleDetail
  /** Dados da loja (TenantSettings.business). Ausente = cabeçalho sem identificação. */
  business?: BusinessSettings
}
