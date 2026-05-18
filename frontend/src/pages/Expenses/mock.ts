import type { Expense } from './types'

export const MOCK_EXPENSES: Expense[] = [
  { id: '1', description: 'Aluguel da loja - Maio', category: 'Aluguel', dueDate: '05/05', renewalDate: '05/06', status: 'Pago', amount: 3200.0, recurring: true },
  { id: '2', description: 'Distribuidora Café Verde', category: 'Fornecedor', dueDate: '12/05', status: 'Pago', amount: 1245.8, recurring: false },
  { id: '3', description: 'Conta de luz', category: 'Energia', dueDate: '14/05', renewalDate: '14/06', status: 'Pendente', amount: 487.3, recurring: true },
  { id: '4', description: 'Folha de pagamento', category: 'Salários', dueDate: '15/05', renewalDate: '15/06', status: 'Pendente', amount: 6800.0, recurring: true },
  { id: '5', description: 'Padaria Central', category: 'Fornecedor', dueDate: '18/05', status: 'Pendente', amount: 890.5, recurring: false },
  { id: '6', description: 'Anúncios Instagram', category: 'Marketing', dueDate: '20/05', renewalDate: '20/06', status: 'Pendente', amount: 320.0, recurring: true },
  { id: '7', description: 'Vivo Fibra', category: 'Internet', dueDate: '22/05', renewalDate: '22/06', status: 'Pendente', amount: 159.9, recurring: true },
]
