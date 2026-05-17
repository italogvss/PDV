import type { SaleRecord } from './types'

export const MOCK_SALES: SaleRecord[] = [
  { id: '#3421', time: '14:32', customer: 'Mariana Costa',   operator: 'Júlia', items: 3, payment: 'Pix',      total: 47.5,  status: 'Pago' },
  { id: '#3420', time: '14:18', customer: 'Cliente avulso',  operator: 'Júlia', items: 1, payment: 'Dinheiro', total: 14.5,  status: 'Pago' },
  { id: '#3419', time: '13:55', customer: 'Rafael Oliveira', operator: 'André', items: 6, payment: 'Crédito',  total: 128,   status: 'Pago' },
  { id: '#3418', time: '13:41', customer: 'Cliente avulso',  operator: 'Júlia', items: 2, payment: 'Pix',      total: 25.5,  status: 'Pago' },
  { id: '#3417', time: '13:22', customer: 'Camila Souza',    operator: 'André', items: 4, payment: 'Débito',   total: 78,    status: 'Pago' },
  { id: '#3416', time: '12:58', customer: 'Cliente avulso',  operator: 'Júlia', items: 1, payment: 'Dinheiro', total: 9,     status: 'Cancelado' },
  { id: '#3415', time: '12:40', customer: 'Bruno Lima',      operator: 'André', items: 3, payment: 'Pix',      total: 56.5,  status: 'Pago' },
  { id: '#3414', time: '12:15', customer: 'Cliente avulso',  operator: 'Júlia', items: 2, payment: 'Crédito',  total: 33,    status: 'Pago' },
  { id: '#3413', time: '11:50', customer: 'Lucas Ferreira',  operator: 'André', items: 5, payment: 'Débito',   total: 92.8,  status: 'Pago' },
  { id: '#3412', time: '11:30', customer: 'Cliente avulso',  operator: 'Júlia', items: 1, payment: 'Pix',      total: 8.5,   status: 'Pendente' },
  { id: '#3411', time: '11:10', customer: 'Ana Paula',       operator: 'Júlia', items: 4, payment: 'Crédito',  total: 67.3,  status: 'Pago' },
  { id: '#3410', time: '10:45', customer: 'Cliente avulso',  operator: 'André', items: 2, payment: 'Dinheiro', total: 21,    status: 'Cancelado' },
  { id: '#3409', time: '10:20', customer: 'Pedro Santos',    operator: 'André', items: 3, payment: 'Pix',      total: 45.6,  status: 'Pago' },
  { id: '#3408', time: '09:55', customer: 'Cliente avulso',  operator: 'Júlia', items: 1, payment: 'Débito',   total: 12.9,  status: 'Pago' },
  { id: '#3407', time: '09:30', customer: 'Fernanda Lima',   operator: 'Júlia', items: 7, payment: 'Crédito',  total: 143.5, status: 'Pago' },
  { id: '#3406', time: '09:10', customer: 'Cliente avulso',  operator: 'André', items: 2, payment: 'Pix',      total: 18.7,  status: 'Pago' },
  { id: '#3405', time: '08:45', customer: 'Carlos Alves',    operator: 'Júlia', items: 3, payment: 'Dinheiro', total: 35.2,  status: 'Pendente' },
  { id: '#3404', time: '08:20', customer: 'Cliente avulso',  operator: 'André', items: 1, payment: 'Crédito',  total: 22.5,  status: 'Pago' },
  { id: '#3403', time: '08:00', customer: 'Marina Silva',    operator: 'Júlia', items: 4, payment: 'Pix',      total: 61.8,  status: 'Pago' },
  { id: '#3402', time: '07:40', customer: 'Cliente avulso',  operator: 'André', items: 2, payment: 'Débito',   total: 29.9,  status: 'Cancelado' },
]
