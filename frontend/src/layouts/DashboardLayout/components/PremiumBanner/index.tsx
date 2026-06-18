import { Box, Typography } from '@mui/material'
import { WorkspacePremiumOutlined } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../../store'


export default function PremiumBanner() {
  const navigate = useNavigate()
  const subscription = useAppSelector((s) => s.auth.subscription)

  const goToSubscription = () => navigate('/configuracoes?tab=assinatura')

  const isPaid = subscription !== null && subscription.planId !== null

  if (isPaid) return null

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Box
        onClick={goToSubscription}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: 'premium.100',
          border: 1,
          borderColor: 'premium.200',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: 'premium.200' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: 'premium.200',
            color: 'premium.800',
            flexShrink: 0,
          }}
        >
          <WorkspacePremiumOutlined sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'premium.900', lineHeight: 1.2 }}>
            Fazer upgrade
          </Typography>
          <Typography variant="caption" sx={{ color: 'premium.800' }}>
            Libere mais recursos
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
