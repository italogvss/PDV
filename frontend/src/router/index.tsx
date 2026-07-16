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
import EmployeeDetailPage from '../pages/Employees/EmployeeDetail'
import ReportsPage from '../pages/Reports'
import CustomersPage from '../pages/Customers'
import CustomerDetailPage from '../pages/Customers/CustomerDetail'
import SuppliersPage from '../pages/Suppliers'
import SupplierDetailPage from '../pages/Suppliers/SupplierDetail'
import SettingsPage from '../pages/Settings'
import SubscriptionReturnPage from '../pages/SubscriptionReturn'
import HelpPage from '../pages/Help'
import LoginPage from '../pages/Login'
import ChoosePlanPage from '../pages/ChoosePlan'
import OnboardingTenant from '../pages/CreateTenant'
import ChangePasswordPage from '../pages/ChangePassword'
import LogsPage from '../pages/Logs'
import ContactPage from '../pages/Contact'

import AdminLayout from '../admin/AdminLayout'
import AdminOverviewPage from '../admin/pages/Overview'
import AdminSubscriptionsPage from '../admin/pages/Subscriptions'
import AdminPaymentsPage from '../admin/pages/Payments'
import AdminPlansPage from '../admin/pages/Plans'
import AdminWebhooksPage from '../admin/pages/Webhooks'
import AdminSupportPage from '../admin/pages/Support'
import AdminAnnouncementsPage from '../admin/pages/Announcements'
import AdminObservabilityPage from '../admin/pages/Observability'
import AdminCompliancePage from '../admin/pages/Compliance'

export const router = createBrowserRouter([
  {
    element: <RouterGuard type="public" />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RouterGuard type="onboarding" />,
    children: [
      { path: '/criar-negocio', element: <OnboardingTenant /> },
      { path: '/planos', element: <ChoosePlanPage /> },
    ],
  },
  {
    element: <RouterGuard type="change-password" />,
    children: [{ path: '/trocar-senha', element: <ChangePasswordPage /> }],
  },
  {
    element: <RouterGuard type="protected" />,
    children: [{ path: '/assinatura/retorno', element: <SubscriptionReturnPage /> }],
  },
  {
    element: <RouterGuard type="dashboard" />,
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
          {
            path: 'servicos',
            element: (
              <PermissionGuard permission="ViewServices">
                <ServicesPage />
              </PermissionGuard>
            ),
          },
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
            children: [
              {
                index: true,
                element: (
                  <PermissionGuard permission="ViewEmployees">
                    <EmployeesPage />
                  </PermissionGuard>
                ),
              },
              {
                path: ':id',
                element: (
                  <PermissionGuard permission="ViewEmployees">
                    <EmployeeDetailPage />
                  </PermissionGuard>
                ),
              },
            ],
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
            children: [
              {
                index: true,
                element: (
                  <PermissionGuard permission="ViewCustomers">
                    <CustomersPage />
                  </PermissionGuard>
                ),
              },
              {
                path: ':id',
                element: (
                  <PermissionGuard permission="ViewCustomers">
                    <CustomerDetailPage />
                  </PermissionGuard>
                ),
              },
            ],
          },
          {
            path: 'fornecedores',
            children: [
              {
                index: true,
                element: (
                  <PermissionGuard permission="ViewSuppliers">
                    <SuppliersPage />
                  </PermissionGuard>
                ),
              },
              {
                path: ':id',
                element: (
                  <PermissionGuard permission="ViewSuppliers">
                    <SupplierDetailPage />
                  </PermissionGuard>
                ),
              },
            ],
          },
          {
            path: 'logs',
            element: (
              <PermissionGuard permission="ViewLogs">
                <LogsPage />
              </PermissionGuard>
            ),
          },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: 'ajuda', element: <HelpPage /> },
          { path: 'contato', element: <ContactPage /> },
        ],
      },
    ],
  },
  {
    element: <RouterGuard type="admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'assinaturas', element: <AdminSubscriptionsPage /> },
          { path: 'pagamentos', element: <AdminPaymentsPage /> },
          { path: 'planos', element: <AdminPlansPage /> },
          { path: 'webhooks', element: <AdminWebhooksPage /> },
          { path: 'suporte', element: <AdminSupportPage /> },
          { path: 'anuncios', element: <AdminAnnouncementsPage /> },
          { path: 'conformidade', element: <AdminCompliancePage /> },
          { path: 'observabilidade', element: <AdminObservabilityPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
