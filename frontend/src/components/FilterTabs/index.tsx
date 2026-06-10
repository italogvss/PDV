import { Tab, Tabs } from '@mui/material'
import type { Props } from './types'

/**
 * Abas de filtro em formato de pílula. Usado para categorias no catálogo de
 * vendas e para profissionais na agenda. Sem indicador; a aba selecionada vira
 * uma pílula colorida (ou neutra, quando a opção não tem cor).
 */
export default function FilterTabs({ value, onChange, options }: Props) {
  return (
    <Tabs
      value={value}
      onChange={(_, next: string) => onChange(next)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        minHeight: 36,
        maxWidth: '100%',
        borderRadius: 999,
        border: 1,
        borderColor: 'border.subtle',
        '& .MuiTab-root': {
          minHeight: 36,
          textTransform: 'none',
          fontSize: 14,
          fontWeight: 500,
          color: 'text.secondary',
          px: 3,
          border: 'none',
          borderRadius: 2,
          mr: 1,
          my: 0.75,
        },
        '& .MuiTabs-indicator': { display: 'none' },
      }}
    >
      {options.map((t) => (
        <Tab
          key={t.value}
          value={t.value}
          label={t.label}
          sx={{
            '&.Mui-selected': {
              color: t.color ? 'black' : 'text.primary',
              bgcolor: t.color ?? 'action.selected',
              fontWeight: 600,
            },
          }}
        />
      ))}
    </Tabs>
  )
}
