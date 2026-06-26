import { api } from './api'
import type { ContactMessage, CreateContactMessagePayload } from '../types/contact.types'

interface BackendContactMessage {
  id: string
  category: string
  subject: string
  body: string
  status: string
  expectedBehavior: string | null
  reproducibility: string | null
  pageContext: string | null
  appVersion: string | null
  browser: string | null
  screenResolution: string | null
  platform: string | null
  createdAt: string
}

function mapContactMessage(m: BackendContactMessage): ContactMessage {
  return {
    id: m.id,
    category: m.category as ContactMessage['category'],
    subject: m.subject,
    body: m.body,
    status: m.status as ContactMessage['status'],
    expectedBehavior: m.expectedBehavior,
    reproducibility: m.reproducibility as ContactMessage['reproducibility'],
    pageContext: m.pageContext,
    appVersion: m.appVersion,
    browser: m.browser,
    screenResolution: m.screenResolution,
    platform: m.platform,
    createdAt: m.createdAt,
  }
}

export const contactService = {
  create: async (payload: CreateContactMessagePayload): Promise<ContactMessage> => {
    const { data } = await api.post<BackendContactMessage>('/contact-messages', payload)
    return mapContactMessage(data)
  },
}
