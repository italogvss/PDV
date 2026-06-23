export type AnnouncementType = 'Info' | 'Feature' | 'Terms' | 'Version'

export interface Announcement {
  id: string
  title: string
  body: string
  type: AnnouncementType
  imageUrl?: string
  ctaLabel?: string
  ctaUrl?: string
}

export interface AnnouncementFeed {
  // Avisos editoriais pendentes (não vistos, ativos e segmentados para o usuário).
  announcements: Announcement[]
  // Keys de ciclo de vida ("lifecycle:*") já vistas pelo usuário.
  seenKeys: string[]
}
