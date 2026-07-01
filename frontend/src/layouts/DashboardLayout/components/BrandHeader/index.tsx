import { Box } from '@mui/material'
import { useThemeMode } from '../../../../context/ThemeModeContext'

export default function BrandHeader() {
  const { mode } = useThemeMode()
  const logo = mode === 'dark' ? '/logo-white.png' : '/logo-black.png'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 3,
      }}
    >
      <Box component="img" src={logo} alt="Kashing" sx={{ height: 40 }} />
    </Box>
  )
}
