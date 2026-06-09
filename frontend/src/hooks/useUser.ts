import { useMutation } from '@tanstack/react-query'
import { userService, type UpdateUserPayload } from '../services/user.service'
import { useAppDispatch } from '../store'
import { setProfile } from '../store/slices/auth.slice'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

export function useUpdateUser() {
  const dispatch = useAppDispatch()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      userService.update(id, payload),
    onSuccess: (user) => {
      dispatch(setProfile({ name: user.name, phone: user.phone ?? null }))
      showToast('Perfil atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar perfil.'),
  })
}
