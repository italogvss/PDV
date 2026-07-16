import { Box, Typography } from '@mui/material'

// Célula de identidade do usuário (nome + email) reutilizada nas grades de assinaturas e pagamentos.
export default function UserCell({ name, email }: { name: string; email: string }) {
  return (
    <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
        {name || '—'}
      </Typography>
      <Typography variant="caption" color="text.tertiary" noWrap>
        {email}
      </Typography>
    </Box>
  )
}
