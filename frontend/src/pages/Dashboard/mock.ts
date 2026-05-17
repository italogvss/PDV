import { DashboardMetrics, DailyBillingData, PaymentMethod, Sale, TopProduct } from '../../types/dashboard.types'

export const MOCK_METRICS: DashboardMetrics = {
  billingToday: 2640,
  billingTodayChange: 50.4,
  lowStockCount: 4,
  criticalStockCount: 3,
  monthlyExpenses: 13103.5,
  monthlyExpensesChange: -4.1,
  estimatedProfit: 13800,
  estimatedProfitChange: 18.7,
}

export const MOCK_DAILY_BILLING: DailyBillingData[] = [
  { date: '01/05', amount: 1800 },
  { date: '02/05', amount: 2100 },
  { date: '03/05', amount: 1950 },
  { date: '04/05', amount: 2300 },
  { date: '05/05', amount: 2500 },
  { date: '06/05', amount: 2800 },
  { date: '07/05', amount: 3100 },
  { date: '08/05', amount: 2700 },
  { date: '09/05', amount: 3200 },
  { date: '10/05', amount: 2900 },
  { date: '11/05', amount: 3300 },
  { date: '12/05', amount: 3500 },
  { date: '13/05', amount: 3100 },
  { date: '14/05', amount: 2640 },
]

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Pix', amount: 35520, percentage: 48, color: '#2fa040' },
  { id: '2', name: 'Cartão crédito', amount: 20685, percentage: 28, color: '#3a82d4' },
  { id: '3', name: 'Dinheiro', amount: 14970, percentage: 20, color: '#f97316' },
  { id: '4', name: 'Débito', amount: 5925, percentage: 8, color: '#6366f1' },
]

export const MOCK_SALES: Sale[] = [
  { id: '1', date: '14/05', time: '14:32', customer: 'João Silva', amount: 145.50, paymentMethod: 'Pix' },
  { id: '2', date: '14/05', time: '13:45', customer: 'Maria Santos', amount: 320.00, paymentMethod: 'Cartão' },
  { id: '3', date: '14/05', time: '12:20', customer: 'Pedro Costa', amount: 87.90, paymentMethod: 'Dinheiro' },
  { id: '4', date: '13/05', time: '18:15', customer: 'Ana Silva', amount: 210.00, paymentMethod: 'Pix' },
  { id: '5', date: '13/05', time: '17:30', customer: 'Carlos Oliveira', amount: 155.75, paymentMethod: 'Cartão' },
  { id: '6', date: '13/05', time: '16:45', customer: 'Lucia Martins', amount: 428.50, paymentMethod: 'Pix' },
]

export const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { id: '1', name: 'Café Premium 500g', sold: 156, revenue: 2340, trend: 24 },
  { id: '2', name: 'Açúcar Cristal 1kg', sold: 89, revenue: 712, trend: 15 },
  { id: '3', name: 'Leite Integral 1L', sold: 234, revenue: 3510, trend: -5 },
  { id: '4', name: 'Pão Francês (Kg)', sold: 412, revenue: 1236, trend: 8 },
  { id: '5', name: 'Manteiga 200g', sold: 67, revenue: 1340, trend: 42 },
]
