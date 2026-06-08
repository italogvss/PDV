import { Box, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'

interface StepInfo {
  label: string
  subtitle: string
}

interface StepperBarProps {
  steps: readonly StepInfo[]
  currentStep: number
}

export default function StepperBar({ steps, currentStep }: StepperBarProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
      {steps.map((step, i) => {
        const num = i + 1
        const isCompleted = num < currentStep
        const isCurrent = num === currentStep

        return (
          <Box
            key={num}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1.8,
              borderRadius: 1,
              flex: { xs: '0 0 calc(50% - 4px)', sm: 1 },
              bgcolor: isCurrent
                ? 'success.main'
                : isCompleted
                  ? 'success.soft'
                  : 'surface.raised',
              color: isCurrent
                ? 'success.contrastText'
                : isCompleted
                  ? 'success.ink'
                  : 'text.disabled',
              transition: 'background-color 0.2s',
            }}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                mr: 1,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: isCurrent
                  ? 'rgba(255,255,255,0.25)'
                  : isCompleted
                    ? 'success.main'
                    : 'surface.paper',
                color: isCurrent ? 'inherit' : isCompleted ? '#fff' : 'text.disabled',
              }}
            >
              {isCompleted ? <CheckIcon sx={{ fontSize: 13 }} /> : num}
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'flex', flexDirection: 'column' }, minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, lineHeight: 1.1 }}
              >
                {step.label}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ opacity: 0.75, lineHeight: 1.3, fontSize: '0.75rem' }}
              >
                {step.subtitle}
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {step.label}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
