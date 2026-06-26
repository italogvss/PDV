export type ContactMessageCategory = 'FeatureSuggestion' | 'BugReport' | 'Compliment' | 'Other'
export type ContactMessageStatus = 'Unread' | 'Read' | 'Archived'
export type Reproducibility = 'Always' | 'Sometimes' | 'HappenedOnce'

export interface ContactMessage {
  id: string
  category: ContactMessageCategory
  subject: string
  body: string
  status: ContactMessageStatus
  expectedBehavior: string | null
  reproducibility: Reproducibility | null
  pageContext: string | null
  appVersion: string | null
  browser: string | null
  screenResolution: string | null
  platform: string | null
  createdAt: string
}

export interface CreateContactMessagePayload {
  category: ContactMessageCategory
  subject: string
  body: string
  expectedBehavior?: string | null
  reproducibility?: Reproducibility | null
  pageContext?: string | null
  appVersion?: string | null
  browser?: string | null
  screenResolution?: string | null
  platform?: string | null
}
