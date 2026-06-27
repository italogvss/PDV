import { useQuery } from '@tanstack/react-query'
import { billingService } from '../services/billing.service'

const QUERY_KEY = ['payment-history'] as const

export function usePaymentHistory(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize],
    queryFn: () => billingService.getPaymentHistory(page, pageSize),
  })
}
