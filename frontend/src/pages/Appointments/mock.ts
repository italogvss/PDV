/**
 * Dados mock do módulo de Agendamentos (fase frontend-first).
 *
 * Profissionais/serviços/clientes/agendamentos vivem aqui até existir a API de
 * `Appointment`. Para integrar depois, troque estes arrays pelos hooks reais
 * (`useEmployees`, `useServices`, `useCustomers`) e pela query de agendamentos.
 */
import dayjs from 'dayjs'
import type { Service, ServiceCategory } from '../../types/service.types'
import type { Customer } from '../../types/customers.types'
import type {
  Appointment,
  AppointmentServiceRef,
  AppointmentStatus,
  Professional,
} from '../../types/appointment.types'

export const MOCK_PROFESSIONALS: Professional[] = [
  { id: 'pro-ana', name: 'Ana Souza', specialty: 'Cabeleireira' },
  { id: 'pro-bruno', name: 'Bruno Lima', specialty: 'Barbeiro' },
  { id: 'pro-carla', name: 'Carla Dias', specialty: 'Manicure' },
]

export const MOCK_CATEGORIES: ServiceCategory[] = [
  { id: 'cat-cabelo', name: 'Cabelo', color: '#9152d4' },
  { id: 'cat-barba', name: 'Barbearia', color: '#3a82d4' },
  { id: 'cat-unhas', name: 'Unhas', color: '#d94576' },
]

function cat(id: string): ServiceCategory {
  return MOCK_CATEGORIES.find((c) => c.id === id) ?? null!
}

export const MOCK_SERVICES: Service[] = [
  { id: 's-corte-fem', name: 'Corte feminino', durationMinutes: 60, price: 80, category: cat('cat-cabelo'), isActive: true },
  { id: 's-escova', name: 'Escova', durationMinutes: 45, price: 60, category: cat('cat-cabelo'), isActive: true },
  { id: 's-coloracao', name: 'Coloração', durationMinutes: 120, price: 200, category: cat('cat-cabelo'), isActive: true },
  { id: 's-corte-masc', name: 'Corte masculino', durationMinutes: 30, price: 45, category: cat('cat-barba'), isActive: true },
  { id: 's-barba', name: 'Barba', durationMinutes: 30, price: 35, category: cat('cat-barba'), isActive: true },
  { id: 's-corte-barba', name: 'Corte + barba', durationMinutes: 50, price: 70, category: cat('cat-barba'), isActive: true },
  { id: 's-manicure', name: 'Manicure', durationMinutes: 40, price: 40, category: cat('cat-unhas'), isActive: true },
  { id: 's-pedicure', name: 'Pedicure', durationMinutes: 50, price: 50, category: cat('cat-unhas'), isActive: true },
]

function emptyAddress(): Customer['address'] {
  return { street: null, number: null, city: null, state: null, zipCode: null }
}

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c-mariana', name: 'Mariana Alves', phone: '(11) 98888-1010', email: null, document: null, note: '', address: emptyAddress() },
  { id: 'c-joao', name: 'João Pedro', phone: '(11) 97777-2020', email: null, document: null, note: '', address: emptyAddress() },
  { id: 'c-fernanda', name: 'Fernanda Costa', phone: '(11) 96666-3030', email: null, document: null, note: '', address: emptyAddress() },
  { id: 'c-roberto', name: 'Roberto Nunes', phone: '(11) 95555-4040', email: null, document: null, note: '', address: emptyAddress() },
  { id: 'c-patricia', name: 'Patrícia Gomes', phone: '(11) 94444-5050', email: null, document: null, note: '', address: emptyAddress() },
]

// ─── Geração dos agendamentos de "hoje" ──────────────────────────────────────

function svcRef(serviceId: string): AppointmentServiceRef {
  const s = MOCK_SERVICES.find((x) => x.id === serviceId)!
  return {
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes ?? 30,
    price: s.price,
    categoryColor: s.category?.color ?? '#807d75',
  }
}

/** ISO de hoje no horário HH:MM. */
function todayAt(hour: number, minute: number): string {
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0).toISOString()
}

interface SeedSpec {
  id: string
  customerId: string
  employeeId: string
  serviceIds: string[]
  hour: number
  minute: number
  status: AppointmentStatus
  note?: string
}

const SEED_SPECS: SeedSpec[] = [
  { id: 'a1', customerId: 'c-mariana', employeeId: 'pro-ana', serviceIds: ['s-corte-fem'], hour: 9, minute: 0, status: 'concluido' },
  { id: 'a2', customerId: 'c-fernanda', employeeId: 'pro-ana', serviceIds: ['s-escova'], hour: 10, minute: 30, status: 'em_atendimento', note: 'Cliente alérgica a amônia.' },
  { id: 'a3', customerId: 'c-patricia', employeeId: 'pro-ana', serviceIds: ['s-coloracao'], hour: 13, minute: 0, status: 'confirmado' },
  { id: 'a4', customerId: 'c-joao', employeeId: 'pro-bruno', serviceIds: ['s-corte-masc'], hour: 9, minute: 30, status: 'concluido' },
  { id: 'a5', customerId: 'c-roberto', employeeId: 'pro-bruno', serviceIds: ['s-corte-barba'], hour: 11, minute: 0, status: 'confirmado' },
  { id: 'a6', customerId: 'c-joao', employeeId: 'pro-bruno', serviceIds: ['s-barba'], hour: 15, minute: 0, status: 'pendente' },
  { id: 'a7', customerId: 'c-mariana', employeeId: 'pro-carla', serviceIds: ['s-manicure'], hour: 10, minute: 0, status: 'confirmado' },
  { id: 'a8', customerId: 'c-fernanda', employeeId: 'pro-carla', serviceIds: ['s-manicure', 's-pedicure'], hour: 14, minute: 0, status: 'pendente', note: 'Trazer foto de referência.' },
]

function buildAppointment(spec: SeedSpec): Appointment {
  const customer = MOCK_CUSTOMERS.find((c) => c.id === spec.customerId)!
  const services = spec.serviceIds.map(svcRef)
  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const price = services.reduce((sum, s) => sum + s.price, 0)
  return {
    id: spec.id,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone ?? undefined,
    employeeId: spec.employeeId,
    services,
    start: todayAt(spec.hour, spec.minute),
    durationMinutes,
    price,
    status: spec.status,
    note: spec.note ?? '',
  }
}

export const SEED_APPOINTMENTS: Appointment[] = SEED_SPECS.map(buildAppointment)
