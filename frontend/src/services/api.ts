import axios, { type InternalAxiosRequestConfig } from 'axios'
import { store } from '../store'
import { clearAuth } from '../store/slices/auth.slice'

interface RetryConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const { tenantId } = store.getState().auth
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig

    if (error.response?.status !== 401 || config._isRetry) {
      return Promise.reject(error)
    }

    config._isRetry = true

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, null, {
        withCredentials: true,
      })
      return api(config)
    } catch {
      store.dispatch(clearAuth())
      return Promise.reject(error)
    }
  },
)
