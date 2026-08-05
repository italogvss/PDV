import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined'
import CampaignOutlined from '@mui/icons-material/CampaignOutlined'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import GroupOutlined from '@mui/icons-material/GroupOutlined'
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined'
import SavingsOutlined from '@mui/icons-material/SavingsOutlined'
import SearchRounded from '@mui/icons-material/SearchRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import {
  Box,
  Button,
  Card,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { GridColDef } from '@mui/x-data-grid'
import { DataGrid } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import DataGridNoRowsOverlay from '../../components/DataGridNoRowsOverlay'
import FiltersPopover from '../../components/FiltersPopover'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import UpsellCard from '../../components/UpsellCard'
import { FEATURES } from '../../constants/entitlements'
import {
  useCancelCreditAccount,
  useCreditAccounts,
  useCreditInstallments,
  useCreditReminder,
  useCreditSummary,
  useReverseCreditPayment,
} from '../../hooks/useCredit'
import { useEntitlements } from '../../hooks/useSubscription'
import { useToast } from '../../hooks/useToast'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import type { CreditAccount, CreditInstallment } from '../../types/credit.types'
import { formatBRL } from '../../utils/currency'
import SelectCustomerModal from '../Sales/components/SelectCustomerModal'
import CreditAgingPanel from './components/CreditAgingPanel'
import CreditDetailModal from './components/CreditDetailModal'
import CreditStatusChip from './components/CreditStatusChip'
import ReceivePaymentModal from './components/ReceivePaymentModal'
import type { StatusFilterOption } from './types'
import { CREDIT_SORT_OPTIONS, STATUS_FILTER_OPTIONS, formatDueDate } from './types'

export default function CreditPage() {
  const [view, setView] = useState<'accounts' | 'installments'>('accounts')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('Todas')
  const [sortValue, setSortValue] = useState('recent')
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null)

  const [detailAccountId, setDetailAccountId] = useState<string | null>(null)
  const [receivingInstallment, setReceivingInstallment] = useState<CreditInstallment | null>(null)
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null)
  const [cancellingAccountId, setCancellingAccountId] = useState<string | null>(null)

  const { hasPermission, isModuleEnabled } = useUserPermissions()
  const canManage = hasPermission('ManageCredit')
  // Cancelar e estornar desfazem dinheiro — permissão própria, separada de receber.
  const canCancel = hasPermission('CancelCredit')
  const { has } = useEntitlements()
  const showToast = useToast()

  // O filtro de status vira parâmetro de servidor: "vencidas" depende da data de hoje
  // comparada com o vencimento, algo que só o backend consegue resolver corretamente.
  const filters = useMemo(
    () => ({
      customerId: customer?.id,
      status:
        statusFilter === 'Quitadas'
          ? ('Paid' as const)
          : statusFilter === 'Em aberto' || statusFilter === 'Vencidas'
            ? ('Open' as const)
            : undefined,
      overdue: statusFilter === 'Vencidas' ? true : undefined,
    }),
    [customer, statusFilter],
  )

  const { data: accounts = [], isLoading: loadingAccounts } = useCreditAccounts(filters)
  const { data: installments = [], isLoading: loadingInstallments } = useCreditInstallments(filters)
  const { data: summary } = useCreditSummary()
  const reversePayment = useReverseCreditPayment()
  const cancelAccount = useCancelCreditAccount()
  const reminder = useCreditReminder()

  const hasAging = has(FEATURES.creditDashboard)

  const accountRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? accounts.filter((a) => a.customerName.toLowerCase().includes(term))
      : accounts
    return [...filtered].sort((a, b) => {
      if (sortValue === 'balanceDesc') return b.balance - a.balance
      if (sortValue === 'customer') return a.customerName.localeCompare(b.customerName)
      if (sortValue === 'dueDate') {
        const aDue = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Infinity
        const bDue = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Infinity
        return aDue - bDue
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [accounts, search, sortValue])

  const installmentRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? installments.filter((i) => i.customerName.toLowerCase().includes(term))
      : installments
    return [...filtered].sort((a, b) => {
      if (sortValue === 'balanceDesc') return b.balance - a.balance
      if (sortValue === 'customer') return a.customerName.localeCompare(b.customerName)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [installments, search, sortValue])

  const handleReminder = (installmentId: string) => {
    reminder.mutate(installmentId, {
      onSuccess: (data) => {
        const text = encodeURIComponent(data.message)
        const phone = data.customerPhone?.replace(/\D/g, '')
        if (phone) {
          window.open(`https://wa.me/55${phone}?text=${text}`, '_blank', 'noopener')
          return
        }
        navigator.clipboard?.writeText(data.message)
        showToast('Cliente sem telefone — mensagem copiada para a área de transferência.', 'info')
      },
    })
  }

  const accountColumns = useMemo<GridColDef<CreditAccount>[]>(
    () => [
      { field: 'customerName', headerName: 'Cliente', flex: 1.4, minWidth: 160 },
      {
        field: 'installments',
        headerName: 'Parcelas',
        width: 110,
        sortable: false,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <Typography variant="body2">
            {row.paidInstallmentCount}/{row.installmentCount}
          </Typography>
        ),
      },
      {
        field: 'totalAmount',
        headerName: 'Total',
        width: 120,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <Typography variant="body2">{formatBRL(row.totalAmount)}</Typography>
        ),
      },
      {
        field: 'paidAmount',
        headerName: 'Recebido',
        width: 120,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <Typography variant="body2" color="success.main">
            {formatBRL(row.paidAmount)}
          </Typography>
        ),
      },
      {
        field: 'balance',
        headerName: 'Saldo',
        width: 120,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatBRL(row.balance)}
          </Typography>
        ),
      },
      {
        field: 'nextDueDate',
        headerName: 'Próx. vencimento',
        width: 150,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <Typography variant="body2" color={row.isOverdue ? 'error.main' : 'text.primary'}>
            {row.nextDueDate ? formatDueDate(row.nextDueDate) : '—'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: ({ row }: { row: CreditAccount }) => (
          <CreditStatusChip status={row.status} isOverdue={row.isOverdue} />
        ),
      },
    ],
    [],
  )

  const installmentColumns = useMemo<GridColDef<CreditInstallment>[]>(
    () => [
      { field: 'customerName', headerName: 'Cliente', flex: 1.4, minWidth: 160 },
      {
        field: 'number',
        headerName: 'Parcela',
        width: 100,
        renderCell: ({ row }: { row: CreditInstallment }) => (
          <Typography variant="body2">
            {row.number}/{row.ofTotal}
          </Typography>
        ),
      },
      {
        field: 'dueDate',
        headerName: 'Vencimento',
        width: 130,
        renderCell: ({ row }: { row: CreditInstallment }) => (
          <Typography variant="body2" color={row.isOverdue ? 'error.main' : 'text.primary'}>
            {formatDueDate(row.dueDate)}
          </Typography>
        ),
      },
      {
        field: 'amount',
        headerName: 'Valor',
        width: 110,
        renderCell: ({ row }: { row: CreditInstallment }) => (
          <Typography variant="body2">{formatBRL(row.amount)}</Typography>
        ),
      },
      {
        field: 'balance',
        headerName: 'Saldo',
        width: 110,
        renderCell: ({ row }: { row: CreditInstallment }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatBRL(row.balance)}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: ({ row }: { row: CreditInstallment }) => (
          <CreditStatusChip status={row.status} isOverdue={row.isOverdue} />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 190,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: { row: CreditInstallment }) =>
          row.status === 'Open' ? (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {canManage && (
                <Button size="small" variant="soft" onClick={() => setReceivingInstallment(row)}>
                  Receber
                </Button>
              )}
              <Tooltip title="Enviar lembrete de cobrança">
                <Button
                  size="small"
                  variant="ghost"
                  startIcon={<CampaignOutlined />}
                  onClick={() => handleReminder(row.id)}
                  disabled={reminder.isPending}
                >
                  Cobrar
                </Button>
              </Tooltip>
            </Box>
          ) : null,
      },
    ],
    // handleReminder é estável o bastante (só usa mutations e toast); reminder.isPending precisa
    // entrar para o botão refletir o loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, reminder.isPending],
  )

  const activeFilterCount = (statusFilter !== 'Todas' ? 1 : 0) + (customer ? 1 : 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Crediário"
        description="Vendas fiado, parcelas a receber e cobrança."
        sortOptions={CREDIT_SORT_OPTIONS}
        sortValue={sortValue}
        onSortChange={setSortValue}
      />

      <PageKpiGrid>
        <PageKpiCard
          icon={AccountBalanceWalletOutlined}
          label="Total a receber"
          value={formatBRL(summary?.totalReceivable ?? 0)}
          badge={{
            label: `${summary?.openAccounts ?? 0} conta(s) em aberto`,
            color: 'default',
          }}
        />
        <PageKpiCard
          icon={WarningAmberRounded}
          label="Vencido"
          value={formatBRL(summary?.overdueAmount ?? 0)}
          valueColor="error"
          badge={{
            label: `${summary?.overdueInstallments ?? 0} parcela(s)`,
            color: 'error',
            icon: WarningAmberRounded,
          }}
        />
        <PageKpiCard
          icon={SavingsOutlined}
          label="Recebido no mês"
          value={formatBRL(summary?.receivedThisMonth ?? 0)}
        />
        <PageKpiCard
          icon={GroupOutlined}
          label="Clientes com saldo"
          value={String(summary?.customersWithBalance ?? 0)}
        />
      </PageKpiGrid>

      {hasAging ? (
        <CreditAgingPanel />
      ) : (
        <UpsellCard
          title="Painel de crediário"
          description="Veja a idade da carteira, a inadimplência e quem mais deve na sua loja."
          highlights={[
            'Idade da carteira por faixa de atraso',
            'Taxa de inadimplência da loja',
            'Ranking dos maiores devedores',
          ]}
        />
      )}

      <Card sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            pt: 1,
            flexWrap: 'wrap',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ minHeight: 44 }}>
            <Tab label="Contas" value="accounts" />
            <Tab label="Parcelas" value="installments" />
          </Tabs>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200, mb: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListRounded />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            sx={{ mb: 1 }}
          >
            {activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : 'Filtros'}
          </Button>

          {isModuleEnabled('customers') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonSearchOutlined />}
              onClick={() => setCustomerModalOpen(true)}
              sx={{ mb: 1 }}
            >
              {customer ? customer.name : 'Cliente'}
            </Button>
          )}
        </Box>

        {view === 'accounts' ? (
          <DataGrid
            rows={accountRows}
            columns={accountColumns}
            getRowId={(row) => row.id}
            rowHeight={60}
            loading={loadingAccounts}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowDoubleClick={(params) => setDetailAccountId(params.row.id)}
            slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          />
        ) : (
          <DataGrid
            rows={installmentRows}
            columns={installmentColumns}
            getRowId={(row) => row.id}
            rowHeight={60}
            loading={loadingInstallments}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowDoubleClick={(params) => setDetailAccountId(params.row.creditAccountId)}
            slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          />
        )}
      </Card>

      <FiltersPopover
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        onClear={() => {
          setStatusFilter('Todas')
          setCustomer(null)
        }}
        sections={[
          {
            id: 'status',
            label: 'Situação',
            options: [...STATUS_FILTER_OPTIONS],
            value: statusFilter,
            onChange: (v) => setStatusFilter(v as StatusFilterOption),
          },
        ]}
      />

      <SelectCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(c) => {
          setCustomer({ id: c.id, name: c.name })
          setCustomerModalOpen(false)
        }}
      />

      <CreditDetailModal
        accountId={detailAccountId}
        onClose={() => setDetailAccountId(null)}
        onReceive={(installment) => setReceivingInstallment(installment)}
        onReverse={(paymentId) => setReversingPaymentId(paymentId)}
        onCancelAccount={(accountId) => setCancellingAccountId(accountId)}
        canManage={canManage}
        canCancel={canCancel}
      />

      <ReceivePaymentModal
        installment={receivingInstallment}
        onClose={() => setReceivingInstallment(null)}
      />

      <ConfirmDialog
        open={reversingPaymentId !== null}
        title="Estornar recebimento"
        description="O valor volta para o saldo devedor da parcela e o registro do recebimento é apagado. Esta ação não pode ser desfeita."
        confirmLabel="Estornar"
        danger
        isPending={reversePayment.isPending}
        onClose={() => setReversingPaymentId(null)}
        onConfirm={() => {
          if (!reversingPaymentId) return
          reversePayment.mutate(reversingPaymentId, { onSuccess: () => setReversingPaymentId(null) })
        }}
      />

      <ConfirmDialog
        open={cancellingAccountId !== null}
        title="Cancelar crediário"
        description="As parcelas em aberto deixam de ser cobradas. Os recebimentos já registrados são preservados."
        confirmLabel="Cancelar crediário"
        danger
        isPending={cancelAccount.isPending}
        onClose={() => setCancellingAccountId(null)}
        onConfirm={() => {
          if (!cancellingAccountId) return
          cancelAccount.mutate(cancellingAccountId, {
            onSuccess: () => {
              setCancellingAccountId(null)
              setDetailAccountId(null)
            },
          })
        }}
      />
    </Box>
  )
}
