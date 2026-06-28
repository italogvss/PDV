import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { GRANULARITIES, type Granularity } from './analytics'

interface Props {
  value: Granularity
  onChange: (value: Granularity) => void
}

export default function GranularityToggle({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, v: Granularity | null) => v && onChange(v)}
    >
      {GRANULARITIES.map((g) => (
        <ToggleButton key={g.key} value={g.key} sx={{ px: 1.25, py: 0.25, textTransform: 'none' }}>
          {g.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
