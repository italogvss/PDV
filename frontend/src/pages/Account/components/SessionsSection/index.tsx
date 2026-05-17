import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
} from '@mui/material'
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined'
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined'

interface Session {
  id: string
  device: string
  location: string
  lastActive: string
  current?: boolean
  type: 'desktop' | 'mobile'
}

const SESSIONS: Session[] = [
  { id: '1', device: 'Chrome no Windows', location: 'São Paulo, SP — Brasil', lastActive: 'Agora', current: true, type: 'desktop' },
  { id: '2', device: 'Safari no iPhone', location: 'São Paulo, SP — Brasil', lastActive: 'há 2 horas', type: 'mobile' },
  { id: '3', device: 'Chrome no MacBook', location: 'São Paulo, SP — Brasil', lastActive: 'há 3 dias', type: 'desktop' },
]

export default function SessionsSection() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Sessões ativas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Dispositivos conectados à sua conta
          </Typography>
        </Box>
        <Button variant="outlined" size="small" color="error">
          Encerrar todas
        </Button>
      </Box>
      <Divider />

      {SESSIONS.map((session, idx) => {
        const Icon = session.type === 'mobile' ? PhoneAndroidOutlinedIcon : ComputerOutlinedIcon
        return (
          <Box key={session.id}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 4,
                py: 2.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'surface.raised',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ fontSize: 18, color: 'text.tertiary' }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      {session.device}
                    </Typography>
                    {session.current && (
                      <Chip
                        label="Esta sessão"
                        size="small"
                        sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {session.location} • {session.lastActive}
                  </Typography>
                </Box>
              </Box>
              {!session.current && (
                <Button variant="outlined" size="small" color="error">
                  Encerrar
                </Button>
              )}
            </Box>
            {idx < SESSIONS.length - 1 && <Divider />}
          </Box>
        )
      })}
    </Paper>
  )
}
