import { Chip } from '@mui/material'
import { metaFor, type StatusMeta } from '../../constants/statusMeta'

// Chip de status de billing. Recebe o mapa de rótulos/cores e o valor cru vindo do backend.
export default function StatusChip({ map, value }: { map: Record<string, StatusMeta>; value: string }) {
  const meta = metaFor(map, value)
  return <Chip label={meta.label} color={meta.color} size="small" variant="outlined" />
}
