import { useEffect } from 'react'
import { useAppDispatch } from '../../store'
import { setAuth, clearAuth } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    authService
      .getMe()
      .then((user) => dispatch(setAuth(user)))
      .catch(() => dispatch(clearAuth()))
  }, [dispatch])

  return <>{children}</>
}
