import { createBrowserRouter, Navigate } from 'react-router-dom'
import RouterGuard from '../components/RouterGuard'
import PermissionGuard from '../components/PermissionGuard'
import DashboardLayout from '../layouts/DashboardLayout'

import DashboardPage from '../pages/Dashboard'
import ServicesPage from '../pages/Services'
import AppointmentsPage from '../pages/Appointments'
import SalesPage from '../pages/Sales'
import SalesHistoryPage from '../pages/SalesHistory'
import InventoryPage from '../pages/Inventory'
import ExpensesPage from '../pages/Expenses'
import EmployeesPage from '../pages/Employees'
import ReportsPage from '../pages/Reports'
import CustomersPage from '../pages/Customers'
import SuppliersPage from '../pages/Suppliers'
import SettingsPage from '../pages/Settings'
import HelpPage from '../pages/Help'
import LoginPage from '../pages/Login'
import OnboardingTenant from '../pages/CreateTenant'
import ChangePasswordPage from '../pages/ChangePassword'

export const router = createBrowserRouter([
  {
    element: <RouterGuard type="public" />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RouterGuard type="onboarding" />,
    children: [{ path: '/criar-negocio', element: <OnboardingTenant /> }],
  },
  {
    element: <RouterGuard type="change-password" />,
    children: [{ path: '/trocar-senha', element: <ChangePasswordPage /> }],
  },
  {
    element: <RouterGuard type="protected" />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'vendas',
            element: (
              <PermissionGuard permission="SellProducts">
                <SalesPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'historico',
            element: (
              <PermissionGuard permission="ViewSalesHistory">
                <SalesHistoryPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'estoque',
            element: (
              <PermissionGuard permission="ViewStock">
                <InventoryPage />
              </PermissionGuard>
            ),
          },
          { path: 'servicos', element: <ServicesPage /> },
          {
            path: 'agendamentos',
            element: (
              <PermissionGuard permission="ViewAppointments">
                <AppointmentsPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'despesas',
            element: (
              <PermissionGuard permission="ViewExpenses">
                <ExpensesPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'funcionarios',
            element: (
              <PermissionGuard permission="ViewEmployees">
                <EmployeesPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'relatorios',
            element: (
              <PermissionGuard permission="ViewReports">
                <ReportsPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'clientes',
            element: (
              <PermissionGuard permission="ViewCustomers">
                <CustomersPage />
              </PermissionGuard>
            ),
          },
          {
            path: 'fornecedores',
            element: (
              <PermissionGuard permission="ViewSuppliers">
                <SuppliersPage />
              </PermissionGuard>
            ),
          },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: 'ajuda', element: <HelpPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
