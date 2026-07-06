import {
  CalendarMonthOutlined,
  CheckCircleOutlined,
  GroupOutlined,
  Help,
  HistoryOutlined,
  InsightsOutlined,
  Inventory2Outlined,
  MiscellaneousServicesOutlined,
  PaidOutlined,
  PeopleAltOutlined,
  PointOfSaleOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import { Box, Link, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material'
import type { ComponentType } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTenantSettings } from '../../hooks/useTenantSettings'

// Contexto disponível para decidir se um modal de ciclo de vida deve aparecer.
export interface LifecycleContext {
  tenantId: string | null
  name: string | null
  pathname: string
}

// Modal fixo, com conteúdo no código e disparo por estado do app. O "visto" é controlado
// pela `key` no backend (UserSeenMarker, prefixo "lifecycle:"). Para adicionar um novo modal
// fixo, basta acrescentar uma entrada aqui — sem migration nem rebuild do backend.
export interface LifecycleModal {
  key: string
  shouldShow: (ctx: LifecycleContext) => boolean
  title: string
  // Componente (não elemento) → renderizado dentro da árvore, pode usar hooks/context/tema.
  Content: ComponentType
}

// Dica final repetida em todo modal de ciclo de vida — aponta para o botão "Ajuda" real,
// presente em toda página (ver components/PageHeader).
function HelpHint() {
  return (
    <Typography variant="body1" color="text.secondary">
      Se precisar de ajuda em qualquer momento, procure pelo botão{' '}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          verticalAlign: 'middle',
          fontSize: '0.875rem',
        }}
      >
        <Help fontSize="inherit" /> Ajuda
      </Box>
      , presente no topo de todas as páginas do sistema.
    </Typography>
  )
}

const RECOMMENDATIONS = [
  { label: 'Cadastre seu primeiro produto', path: '/estoque', icon: Inventory2Outlined },
  { label: 'Cadastre um cliente', path: '/clientes', icon: PeopleAltOutlined },
  { label: 'Cadastre um funcionário', path: '/funcionarios', icon: GroupOutlined },
  { label: 'Realize uma venda', path: '/vendas', icon: PointOfSaleOutlined },
]

function WelcomeContent() {
  const { data } = useTenantSettings()
  return (
    <Box>
      <Typography variant="h1" color="text.secondary" sx={{ mb: 1.5 }}>
        Seja bem vindo(a) ao Kashing!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
        O sistema que vai fazer o(a) {data?.business.companyName} fazer Ka-shing!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Para começar, aqui estão algumas sugestões:
      </Typography>
      <List dense sx={{ mb: 1.5 }}>
        {RECOMMENDATIONS.map(({ label, path, icon: Icon }) => (
          <ListItem key={path} disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText
              sx={{ fontWeight: 700 }}
              primary={
                <Link component={RouterLink} to={path} color="secondary" underline="hover">
                  {label}
                </Link>
              }
            />
          </ListItem>
        ))}
      </List>
      <HelpHint />
    </Box>
  )
}

interface RelatedLink {
  label: string
  path: string
  icon: SvgIconComponent
}

interface ModuleIntroConfig {
  id: string
  path: string
  title: string
  icon: SvgIconComponent
  description: string
  capabilities: string[]
  related?: RelatedLink[]
}

// Uma entrada por módulo com modal de apresentação. Novo módulo → só acrescentar aqui.
const MODULE_INTROS: ModuleIntroConfig[] = [
  {
    id: 'sales',
    path: '/vendas',
    title: 'Vendas / PDV',
    icon: PointOfSaleOutlined,
    description: 'Este é o ponto de venda da sua loja',
    capabilities: [
      'Busque produtos ou serviços por nome ou código de barras',
      'Atribua vendas a clientes e funcionários',
      'Aplique descontos e selecione formas de pagamento',
      'Baixa automática no estoque a cada venda', 
    ],
    related: [
      { label: 'Histórico de vendas', path: '/historico', icon: ReceiptLongOutlined },
      { label: 'Estoque', path: '/estoque', icon: Inventory2Outlined },
      { label: 'Serviços', path: '/servicos', icon: MiscellaneousServicesOutlined },
    ],
  },
  {
    id: 'sales-history',
    path: '/historico',
    title: 'Histórico de vendas',
    icon: ReceiptLongOutlined,
    description: 'Todo o histórico de vendas realizadas, sempre à mão.',
    capabilities: [
      'Filtre por período, cliente ou forma de pagamento',
      'Veja os itens e detalhes de cada venda',
      'Cancele uma venda quando necessário',
    ],
    related: [
      { label: 'Vendas', path: '/vendas', icon: PointOfSaleOutlined },
      { label: 'Relatórios', path: '/relatorios', icon: InsightsOutlined },
    ],
  },
  {
    id: 'inventory',
    path: '/estoque',
    title: 'Estoque',
    icon: Inventory2Outlined,
    description: 'Cadastre e controle os produtos do seu negócio.',
    capabilities: [
      'Cadastre produtos com categoria e preço',
      'Acompanhe a quantidade disponível em tempo real',
    ],
    related: [{ label: 'Vendas', path: '/vendas', icon: PointOfSaleOutlined }],
  },
  {
    id: 'services',
    path: '/servicos',
    title: 'Serviços',
    icon: MiscellaneousServicesOutlined,
    description: 'O catálogo dos serviços oferecidos pelo seu negócio.',
    capabilities: [
      'Cadastre serviços com preço e duração',
      'Utilize cada serviço aos agendamentos',
    ],
    related: [{ label: 'Agendamentos', path: '/agendamentos', icon: CalendarMonthOutlined }],
  },
  {
    id: 'appointments',
    path: '/agendamentos',
    title: 'Agendamentos',
    icon: CalendarMonthOutlined,
    description: 'A agenda de horários marcados com seus clientes.',
    capabilities: [
      'Visualize a agenda por dia ou por semana',
      'Marque horários vinculados a um serviço e cliente',
      'Acompanhe o status de cada agendamento',
      'Crie uma venda a partir de um agendamento concluído',
    ],
    related: [
      { label: 'Serviços', path: '/servicos', icon: MiscellaneousServicesOutlined },
      { label: 'Clientes', path: '/clientes', icon: PeopleAltOutlined },
    ],
  },
  {
    id: 'expenses',
    path: '/despesas',
    title: 'Despesas',
    icon: PaidOutlined,
    description: 'Controle as contas e despesas do seu negócio.',
    capabilities: [
      'Cadastre as despesas do seu empreendimento',
      'Organize por categoria',
      'Visualize seus gastos por período e categoria',
    ],
    related: [{ label: 'Relatórios', path: '/relatorios', icon: InsightsOutlined }],
  },
  {
    id: 'employees',
    path: '/funcionarios',
    title: 'Funcionários',
    icon: GroupOutlined,
    description: 'Cadastre sua equipe e controle o que cada um pode acessar.',
    capabilities: [
      'Cadastre funcionários e defina cargos',
      'Configure permissões por módulo',
      'Acompanhe o que cada um faz pelos Logs',
    ],
    related: [{ label: 'Logs', path: '/logs', icon: HistoryOutlined }],
  },
  {
    id: 'reports',
    path: '/relatorios',
    title: 'Relatórios',
    icon: InsightsOutlined,
    description: 'Indicadores e lucros do seu negócio em um só lugar.',
    capabilities: [
      'Acompanhe vendas, lucro e produtos mais vendidos',
      'Compare períodos diferentes',
    ],
    related: [
      { label: 'Vendas', path: '/vendas', icon: PointOfSaleOutlined },
      { label: 'Despesas', path: '/despesas', icon: PaidOutlined },
    ],
  },
  {
    id: 'customers',
    path: '/clientes',
    title: 'Clientes',
    icon: PeopleAltOutlined,
    description: 'Cadastro e relacionamento com seus clientes.',
    capabilities: [
      'Cadastre clientes com contato e endereço',
      'Veja o histórico de compras de cada um',
      'Abra o WhatsApp direto pela ficha do cliente',
    ],
    related: [{ label: 'Vendas', path: '/vendas', icon: PointOfSaleOutlined }],
  },
  {
    id: 'logs',
    path: '/logs',
    title: 'Auditoria',
    icon: HistoryOutlined,
    description: 'O histórico de tudo o que acontece no sistema.',
    capabilities: [
      'Acompanhe alterações de preço, estoque e status',
      'Veja quem fez cada ação e quando',
    ],
    related: [{ label: 'Funcionários', path: '/funcionarios', icon: GroupOutlined }],
  },
]

function ModuleIntroContent({ icon: Icon, title, description, capabilities, related }: ModuleIntroConfig) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Icon color="secondary" />
        <Typography variant="h1" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
        {description}
      </Typography>
      <List dense sx={{ mb: 1 }}>
        {capabilities.map((capability) => (
          <ListItem key={capability} disableGutters sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlined fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText primary={capability} />
          </ListItem>
        ))}
      </List>
      {related && related.length > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}
        >
          Veja também:
          {related.map(({ label, path, icon: RelatedIcon }) => (
            <Link
              key={path}
              component={RouterLink}
              to={path}
              color="secondary"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <RelatedIcon fontSize="inherit" /> {label}
            </Link>
          ))}
        </Typography>
      )}
      <HelpHint />
    </Box>
  )
}

const moduleIntroModals: LifecycleModal[] = MODULE_INTROS.map((config) => ({
  key: `lifecycle:intro:${config.id}`,
  // Aparece na primeira vez que a página do módulo é aberta.
  shouldShow: (ctx) => !!ctx.tenantId && ctx.pathname === config.path,
  title: '',
  Content: () => <ModuleIntroContent {...config} />,
}))

export const LIFECYCLE_MODALS: LifecycleModal[] = [
  {
    key: 'lifecycle:welcome',
    // Aparece na primeira entrada no dashboard após a loja existir.
    shouldShow: (ctx) => !!ctx.tenantId,
    title: '',
    Content: WelcomeContent,
  },
  ...moduleIntroModals,
]
