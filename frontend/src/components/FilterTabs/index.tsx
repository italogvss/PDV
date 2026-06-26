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
        maxWidth: '100%',
        borderRadius: 999,
        border: 1,
        borderColor: 'border.subtle',
        backgroundColor: "surface.sunken",
        '& .MuiTab-root': {
          px: 3,
          py: 2,
          fontSize: 16,
          fontWeight: 500,
          color: 'text.secondary',
          border: '1px solid transparent',
          borderRadius: 999,
          mr: 1,
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
            px: 1,
            '&:hover': {
              backgroundColor: 'surface.raised',
              borderColor: 'secondary.main',
            },
            '&.Mui-selected': {
              '&:hover': {border: "none"},
              fontWeight: 600,
              borderRadius: 999,
              color: "common.white",
              backgroundColor: t.color ?? 'neutral.300',
            },
          }}
        />
      ))}
    </Tabs>
  )
}
