import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

// Contexto disponível para decidir se um modal de ciclo de vida deve aparecer.
export interface LifecycleContext {
  tenantId: string | null
  name: string | null
}

// Modal fixo, com conteúdo no código e disparo por estado do app. O "visto" é controlado
// pela `key` no backend (UserSeenMarker, prefixo "lifecycle:"). Para adicionar um novo modal
// fixo, basta acrescentar uma entrada aqui — sem migration nem rebuild do backend.
export interface LifecycleModal {
  key: string
  shouldShow: (ctx: LifecycleContext) => boolean
  title: string
  body: ReactNode
}

export const LIFECYCLE_MODALS: LifecycleModal[] = [
  {
    key: 'lifecycle:welcome',
    // Aparece na primeira entrada no dashboard após a loja existir.
    shouldShow: (ctx) => !!ctx.tenantId,
    title: 'Bem-vindo ao PDV-Ultra! 🎉',
    body: (
      <Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
          Sua loja foi criada com sucesso. Aqui vão os primeiros passos para começar:
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography component="li" variant="body1" color="text.secondary">
            Cadastre seus <strong>produtos</strong> e categorias.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Registre sua primeira <strong>venda</strong> no PDV.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Ajuste as <strong>configurações</strong> da loja e formas de pagamento.
          </Typography>
        </Box>
      </Box>
    ),
  },
]
