export type AvatarColorKey = 'purple' | 'accent' | 'orange' | 'pink' | 'blue' | 'teal'

export type EmployeeStatus = 'Em turno' | 'Em pausa' | 'Fora do turno'

export type EmployeeRole = 'Gerente' | 'Atendente' | 'Caixa' | 'Estoquista'

export type EmployeeShift = 'Turno Integral' | 'Turno Manhã' | 'Turno Tarde' | 'Turno Noite'

export const EMPLOYEE_ROLES: EmployeeRole[] = ['Gerente', 'Atendente', 'Caixa', 'Estoquista']

export const EMPLOYEE_SHIFTS: EmployeeShift[] = [
  'Turno Integral',
  'Turno Manhã',
  'Turno Tarde',
  'Turno Noite',
]

export interface Employee {
  id: string
  name: string
  initials: string
  colorKey: AvatarColorKey
  role: EmployeeRole
  shift: EmployeeShift
  status: EmployeeStatus
  salesToday: number
  commission: number
}
