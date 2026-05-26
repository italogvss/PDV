import { useContext } from 'react'
import { ToastContext } from '../context/ToastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx.showToast
}
