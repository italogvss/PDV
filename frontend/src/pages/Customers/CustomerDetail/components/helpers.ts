export const PAYMENT_COLORS: Record<string, string> = {
  PIX: '#4caf50',
  CreditCard: '#2196f3',
  DebitCard: '#ff9800',
  Cash: '#9e9e9e',
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  Confirmado: 'Confirmado',
  Pendente: 'Pendente',
  EmAtendimento: 'Em atendimento',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

export const APPOINTMENT_STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
  Confirmado: 'success',
  Pendente: 'warning',
  EmAtendimento: 'info',
  Concluido: 'default',
  Cancelado: 'error',
}

export function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function formatMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
}

export function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  const diffMonths = Math.floor(diffDays / 30)
  return `há ${diffMonths} ${diffMonths !== 1 ? 'meses' : 'mês'}`
}

export function formatAppointmentDate(dateStr: string) {
  const date = new Date(dateStr)
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date)
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  const cap = weekday.replace('.', '')
  return `${cap.charAt(0).toUpperCase() + cap.slice(1)}, ${dayMonth} · ${time}`
}
