import { useMemo, useState, type ReactNode } from 'react'
import { Box } from '@mui/material'
import { useAnnouncementFeed, useMarkSeen } from '../../hooks/useAnnouncements'
import { useAppSelector } from '../../store'
import MarkdownRenderer from '../MarkdownRenderer'
import AnnouncementModal from './AnnouncementModal'
import { LIFECYCLE_MODALS } from './lifecycle'

interface QueueItem {
  key: string
  title: string
  content: ReactNode
  ctaLabel?: string
  ctaUrl?: string
}

// Orquestra a fila de avisos pós-login: modais de ciclo de vida elegíveis primeiro, depois os
// editoriais (já ordenados por prioridade no backend). Exibe um por vez; ao fechar, marca como
// visto no backend e avança para o próximo.
export default function AnnouncementCenter() {
  const { data } = useAnnouncementFeed()
  const { tenantId, name } = useAppSelector(s => s.auth)
  const markSeen = useMarkSeen()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const queue = useMemo<QueueItem[]>(() => {
    if (!data) return []
    const seen = new Set(data.seenKeys)

    const lifecycle = LIFECYCLE_MODALS
      .filter(m => !seen.has(m.key) && m.shouldShow({ tenantId, name }))
      .map<QueueItem>(m => ({ key: m.key, title: m.title, content: m.body }))

    const editorial = data.announcements.map<QueueItem>(a => ({
      key: a.id,
      title: a.title,
      ctaLabel: a.ctaLabel,
      ctaUrl: a.ctaUrl,
      content: (
        <>
          {a.imageUrl && (
            <Box
              component="img"
              src={a.imageUrl}
              alt=""
              sx={{ width: '100%', borderRadius: 2, mb: 2 }}
            />
          )}
          <MarkdownRenderer content={a.body} />
        </>
      ),
    }))

    return [...lifecycle, ...editorial]
  }, [data, tenantId, name])

  const current = queue.find(item => !dismissed.has(item.key))
  if (!current) return null

  const handleClose = () => {
    markSeen.mutate(current.key)
    setDismissed(prev => new Set(prev).add(current.key))
  }

  return (
    <AnnouncementModal
      open
      title={current.title}
      onClose={handleClose}
      ctaLabel={current.ctaLabel}
      ctaUrl={current.ctaUrl}
    >
      {current.content}
    </AnnouncementModal>
  )
}
