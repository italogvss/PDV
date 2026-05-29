import type { Employee } from '../../../../types/employee.types'

export interface EditEmployeeModalProps {
  employee: Employee
  open: boolean
  onClose: () => void
}
