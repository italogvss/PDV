import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import PublicRoute from '../components/PublicRoute'
import DashboardLayout from '../layouts/DashboardLayout'

import DashboardPage from '../pages/Dashboard'
import SalesPage from '../pages/Sales'
import SalesHistoryPage from '../pages/SalesHistory'
import InventoryPage from '../pages/Inventory'
import ExpensesPage from '../pages/Expenses'
import EmployeesPage from '../pages/Employees'
import ReportsPage from '../pages/Reports'
import CustomersPage from '../pages/Customers'
import SuppliersPage from '../pages/Suppliers'
import SettingsPage from '../pages/Settings'
import AccountPage from '../pages/Account'
import HelpPage from '../pages/Help'
import LoginPage from '../pages/Login'

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'vendas', element: <SalesPage /> },
          { path: 'historico', element: <SalesHistoryPage /> },
          { path: 'estoque', element: <InventoryPage /> },
          { path: 'despesas', element: <ExpensesPage /> },
          { path: 'funcionarios', element: <EmployeesPage /> },
          { path: 'relatorios', element: <ReportsPage /> },
          { path: 'clientes', element: <CustomersPage /> },
          { path: 'fornecedores', element: <SuppliersPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: 'conta', element: <AccountPage /> },
          { path: 'ajuda', element: <HelpPage /> },
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
