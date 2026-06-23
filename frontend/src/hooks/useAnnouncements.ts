import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { announcementService } from '../services/announcement.service'
import type { AnnouncementFeed } from '../types/announcement.types'
import { useAppSelector } from '../store'

const FEED_KEY = ['announcements', 'feed'] as const

// Feed pós-login. Desabilitado durante o onboarding (sem tenantId) para não aparecer modal
// antes da loja existir. Busca uma vez por sessão — o "visto" é marcado via useMarkSeen.
export function useAnnouncementFeed() {
  const { isAuthenticated, tenantId } = useAppSelector(s => s.auth)
  return useQuery({
    queryKey: FEED_KEY,
    queryFn: () => announcementService.getFeed(),
    enabled: isAuthenticated && !!tenantId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useMarkSeen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => announcementService.markSeen(key),
    onSuccess: (_data, key) => {
      // Atualiza o cache: remove o aviso editorial visto e registra a key de ciclo de vida.
      queryClient.setQueryData<AnnouncementFeed>(FEED_KEY, (prev) =>
        prev
          ? {
              announcements: prev.announcements.filter(a => a.id !== key),
              seenKeys: prev.seenKeys.includes(key) ? prev.seenKeys : [...prev.seenKeys, key],
            }
          : prev,
      )
    },
  })
}
