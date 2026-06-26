import { useState } from 'react'
import {
  BlockOutlined,
  CalendarMonthOutlined,
  DeleteForeverOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  MiscellaneousServicesOutlined,
  PaidOutlined,
  PeopleAltOutlined,
  PointOfSaleOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import { Box, Button } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ConfirmPhraseDialog from '../../../../components/ConfirmPhraseDialog'
import { usePurgeEntity } from '../../../../hooks/usePurgeEntity'
import type { EntityKey } from '../../../../services/tenantData.service'

interface DeletableEntity {
  key: EntityKey
  label: string
  sublabel: string
  icon: SvgIconComponent
}

const DELETABLE_ENTITIES: DeletableEntity[] = [
  { key: 'products', label: 'Produtos', sublabel: 'Remove todo o estoque cadastrado', icon: Inventory2Outlined },
  { key: 'sales', label: 'Vendas', sublabel: 'Apaga o histórico de vendas', icon: PointOfSaleOutlined },
  { key: 'services', label: 'Serviços', sublabel: 'Remove os serviços cadastrados', icon: MiscellaneousServicesOutlined },
  { key: 'appointments', label: 'Agendamentos', sublabel: 'Apaga todos os agendamentos', icon: CalendarMonthOutlined },
  { key: 'expenses', label: 'Despesas', sublabel: 'Remove o histórico de despesas', icon: PaidOutlined },
  { key: 'customers', label: 'Clientes', sublabel: 'Apaga a base de clientes', icon: PeopleAltOutlined },
  { key: 'suppliers', label: 'Fornecedores', sublabel: 'Remove os fornecedores cadastrados', icon: LocalShippingOutlined },
]

export default function AdvancedSection() {
  const purge = usePurgeEntity()
  const [target, setTarget] = useState<DeletableEntity | null>(null)

  const handleClose = () => {
    if (purge.isPending) return
    setTarget(null)
  }

  const handleConfirm = () => {
    if (!target) return
    purge.mutate(target.key, { onSuccess: () => handleClose() })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard
        title="Excluir dados do estabelecimento"
        subtitle="Exclusão definitiva e irreversível. Os registros não vão para a lixeira."
        danger
      >
        {DELETABLE_ENTITIES.map((entity) => {
          const Icon = entity.icon
          return (
            <SettingRow key={entity.key} label={entity.label} sublabel={entity.sublabel}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Icon />}
                onClick={() => setTarget(entity)}
                sx={{ minWidth: 200 }}
              >
                Excluir {entity.label}
              </Button>
            </SettingRow>
          )
        })}
      </SettingCard>

      <SettingCard title="Zona de risco" subtitle="Ações irreversíveis. Tenha cuidado." danger>
        <SettingRow
          label="Encerrar estabelecimento"
          sublabel="Cancela a assinatura e remove o acesso permanentemente"
        >
          <Button
            variant="contained"
            color="error"
            startIcon={<BlockOutlined />}
            sx={{ minWidth: 200 }}
          >
            Encerrar conta
          </Button>
        </SettingRow>
      </SettingCard>

      <ConfirmPhraseDialog
        open={!!target}
        onClose={handleClose}
        title={target ? `Excluir todos os ${target.label}` : ''}
        warningText={
          target ? (
            <>
              Você está prestes a excluir <strong>permanentemente</strong> todos os{' '}
              <strong>{target.label}</strong> deste estabelecimento. Os dados não poderão
              ser recuperados.
            </>
          ) : null
        }
        confirmPhrase={target ? `Eu quero excluir para sempre todos os ${target.label}` : ''}
        confirmButtonLabel="Excluir para sempre"
        confirmButtonIcon={<DeleteForeverOutlined />}
        isPending={purge.isPending}
        onConfirm={handleConfirm}
      />
    </Box>
  )
}
