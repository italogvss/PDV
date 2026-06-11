import { useEffect, useState } from 'react'
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
  WarningAmberRounded,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import ModalHeader from '../../../../components/ModalHeader'
import { usePurgeEntity } from '../../../../hooks/usePurgeEntity'
import type { EntityKey } from '../../../../services/tenantData.service'

interface DeletableEntity {
  key: EntityKey
  label: string
  sublabel: string
  icon: SvgIconComponent
}

// Mesma iconografia do SidebarNav, por seção correspondente.
const DELETABLE_ENTITIES: DeletableEntity[] = [
  { key: 'products', label: 'Produtos', sublabel: 'Remove todo o estoque cadastrado', icon: Inventory2Outlined },
  { key: 'sales', label: 'Vendas', sublabel: 'Apaga o histórico de vendas', icon: PointOfSaleOutlined },
  { key: 'services', label: 'Serviços', sublabel: 'Remove os serviços cadastrados', icon: MiscellaneousServicesOutlined },
  { key: 'appointments', label: 'Agendamentos', sublabel: 'Apaga todos os agendamentos', icon: CalendarMonthOutlined },
  { key: 'expenses', label: 'Despesas', sublabel: 'Remove o histórico de despesas', icon: PaidOutlined },
  { key: 'customers', label: 'Clientes', sublabel: 'Apaga a base de clientes', icon: PeopleAltOutlined },
  { key: 'suppliers', label: 'Fornecedores', sublabel: 'Remove os fornecedores cadastrados', icon: LocalShippingOutlined },
]

function confirmationPhrase(label: string) {
  return `Eu quero excluir para sempre todos os ${label}`
}

export default function AdvancedSection() {
  const purge = usePurgeEntity()
  const [target, setTarget] = useState<DeletableEntity | null>(null)
  const [typed, setTyped] = useState('')

  // Limpa o texto digitado sempre que abrir/trocar de entidade.
  useEffect(() => {
    setTyped('')
  }, [target])

  const expectedPhrase = target ? confirmationPhrase(target.label) : ''
  const phraseMatches = typed === expectedPhrase // case sensitive

  const handleClose = () => {
    if (purge.isPending) return
    setTarget(null)
  }

  const handleConfirm = () => {
    if (!target || !phraseMatches) return
    purge.mutate(target.key, {
      onSuccess: () => handleClose(),
    })
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

      <Dialog open={!!target} onClose={handleClose} maxWidth="sm" fullWidth>
        {target && (
          <>
            <ModalHeader
              title={`Excluir todos os ${target.label}`}
              subtitle="Esta ação é irreversível."
              onClose={handleClose}
              disabled={purge.isPending}
            />
            <DialogContent>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: 'error.soft',
                  color: 'error.ink',
                }}
              >
                <WarningAmberRounded sx={{ fontSize: 22, mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2">
                  Você está prestes a excluir <strong>permanentemente</strong> todos os{' '}
                  <strong>{target.label}</strong> deste estabelecimento. Os dados não poderão
                  ser recuperados.
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Para confirmar, escreva exatamente a frase abaixo:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 1.5,
                  userSelect: 'none',
                }}
              >
                {expectedPhrase}
              </Typography>

              <TextField
                fullWidth
                size="small"
                autoComplete="off"
                placeholder={expectedPhrase}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={purge.isPending}
                error={typed.length > 0 && !phraseMatches}
                helperText={
                  typed.length > 0 && !phraseMatches
                    ? 'A frase não confere (diferencia maiúsculas e minúsculas).'
                    : ' '
                }
              />
            </DialogContent>
            <DialogActions>
              <Button variant="ghost" onClick={handleClose} disabled={purge.isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={
                  purge.isPending
                    ? <CircularProgress size={16} color="inherit" />
                    : <DeleteForeverOutlined />
                }
                disabled={!phraseMatches || purge.isPending}
                onClick={handleConfirm}
              >
                {purge.isPending ? 'Excluindo...' : 'Excluir para sempre'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
