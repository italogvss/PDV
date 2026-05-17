import { Chip } from '@mui/material'
import DiamondOutlined from '@mui/icons-material/DiamondOutlined'
import MoneyRounded from '@mui/icons-material/MoneyRounded'
import CreditCardRounded from '@mui/icons-material/CreditCardRounded'
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded'
import type { SvgIconComponent } from '@mui/icons-material'
import type { PaymentChipProps } from './types'
import type { SalePaymentMethod } from '../../types'

const iconMap: Record<SalePaymentMethod, SvgIconComponent> = {
  Pix: DiamondOutlined,
  Dinheiro: MoneyRounded,
  Crédito: CreditCardRounded,
  Débito: AccountBalanceWalletRounded,
}

export default function PaymentChip({ method }: PaymentChipProps) {
  const Icon = iconMap[method]
  return (
    <Chip
      size="small"
      label={method}
      icon={<Icon />}
    />
  )
}
