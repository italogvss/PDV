import { ReportMetrics, DailyRevenueData, AccumulatedProfitData } from '../../types/report.types'

export const MOCK_METRICS: ReportMetrics = {
  totalRevenue: 34130,
  netProfit: 13780,
  costs: 20350,
  averageTicket: 42.8,
  revenueChangePercent: 18,
  profitMarginPercent: 40.4,
  costsChangePercent: -2.3,
  averageTicketChange: 3.2,
}

export const MOCK_DAILY_REVENUE: DailyRevenueData[] = [
  { date: '01/05', revenue: 2200, profit: 880 },
  { date: '02/05', revenue: 2600, profit: 1040 },
  { date: '03/05', revenue: 2100, profit: 840 },
  { date: '04/05', revenue: 1900, profit: 760 },
  { date: '05/05', revenue: 2400, profit: 960 },
  { date: '06/05', revenue: 2800, profit: 1120 },
  { date: '07/05', revenue: 3100, profit: 1240 },
  { date: '08/05', revenue: 2500, profit: 1000 },
  { date: '09/05', revenue: 2900, profit: 1160 },
  { date: '10/05', revenue: 3500, profit: 1400 },
  { date: '11/05', revenue: 3000, profit: 1200 },
  { date: '12/05', revenue: 2700, profit: 1080 },
  { date: '13/05', revenue: 3300, profit: 1320 },
  { date: '14/05', revenue: 2530, profit: 1012 },
]

export const MOCK_ACCUMULATED_PROFIT: AccumulatedProfitData[] = [
  { date: '01/05', profit: 880 },
  { date: '02/05', profit: 1920 },
  { date: '03/05', profit: 2760 },
  { date: '04/05', profit: 3520 },
  { date: '05/05', profit: 4480 },
  { date: '06/05', profit: 5600 },
  { date: '07/05', profit: 6840 },
  { date: '08/05', profit: 7840 },
  { date: '09/05', profit: 9000 },
  { date: '10/05', profit: 10400 },
  { date: '11/05', profit: 11600 },
  { date: '12/05', profit: 12680 },
  { date: '13/05', profit: 14000 },
  { date: '14/05', profit: 15012 },
]
