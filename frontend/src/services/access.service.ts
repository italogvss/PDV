import { api } from './api'
import type { AccessMetadata } from '../types/access.types'

export const accessService = {
  getMetadata: async (): Promise<AccessMetadata> => {
    const { data } = await api.get<AccessMetadata>('/access/metadata')
    return data
  },
}
