export interface EmployeeFormState {
  roleId: string
  phone: string
  autoCreateSalaryExpense: boolean
  salary: number | undefined
  paymentDay: number | undefined
  newPassword: string
}

export interface EmployeeFormErrors {
  salary?: string
  paymentDay?: string
  newPassword?: string
}
