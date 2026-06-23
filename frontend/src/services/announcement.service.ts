import { api } from './api'
import type { Announcement, AnnouncementFeed, AnnouncementType } from '../types/announcement.types'

interface BackendAnnouncement {
  id: string
  title: string
  body: string
  type: string
  imageUrl?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
}

interface BackendFeed {
  announcements: BackendAnnouncement[]
  seenKeys: string[]
}

function mapAnnouncement(a: BackendAnnouncement): Announcement {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    type: (a.type as AnnouncementType) ?? 'Info',
    imageUrl: a.imageUrl ?? undefined,
    ctaLabel: a.ctaLabel ?? undefined,
    ctaUrl: a.ctaUrl ?? undefined,
  }
}

export const announcementService = {
  getFeed: async (): Promise<AnnouncementFeed> => {
    const { data } = await api.get<BackendFeed>('/announcements/feed')
    return {
      announcements: data.announcements.map(mapAnnouncement),
      seenKeys: data.seenKeys,
    }
  },

  markSeen: async (key: string): Promise<void> => {
    await api.post('/announcements/seen', { key })
  },
}
