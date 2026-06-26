import { AttachMoney, Pix, type SvgIconComponent } from '@mui/icons-material'
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded'
import CreditCardRounded from '@mui/icons-material/CreditCardRounded'
import MoneyRounded from '@mui/icons-material/MoneyRounded'
import { Chip } from '@mui/material'
import type { SalePaymentMethod } from '../../types'
import type { PaymentChipProps } from './types'

const iconMap: Record<SalePaymentMethod, SvgIconComponent> = {
  Pix: Pix,
  Dinheiro: AttachMoney,
  Crédito: CreditCardRounded,
  Débito: AccountBalanceWalletRounded,
}

export default function PaymentChip({ method }: PaymentChipProps) {
  const Icon = iconMap[method]
  return (
    <Chip
      label={method}
      icon={<Icon />}
    />
  )
}
