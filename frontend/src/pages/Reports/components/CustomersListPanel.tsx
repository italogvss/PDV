import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import ChartCard from '../../../components/ChartCard'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import { useCustomers } from '../../../hooks/useCustomers'

const PANEL_HEIGHT = 420

const columns: GridColDef[] = [{ field: 'name', headerName: 'Nome', flex: 1 }]

export default function CustomersListPanel() {
  const navigate = useNavigate()
  const { data, isLoading } = useCustomers(1, 500)
  const rows = data?.data ?? []

  return (
    <ChartCard
      title="Clientes cadastrados"
      subtitle="Duplo clique em um cliente para abrir o cadastro completo"
      info="Lista de todos os clientes cadastrados. Duplo clique numa linha abre o detalhe do cliente."
      loading={isLoading}
      isEmpty={rows.length === 0}
      emptyText="Nenhum cliente cadastrado."
      height={PANEL_HEIGHT}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        rowHeight={56}
        disableRowSelectionOnClick
        pageSizeOptions={[10]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        onRowDoubleClick={(params) => navigate(`/clientes/${params.row.id}`)}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        sx={{ height: PANEL_HEIGHT, border: 'none', cursor: 'pointer' }}
      />
    </ChartCard>
  )
}
