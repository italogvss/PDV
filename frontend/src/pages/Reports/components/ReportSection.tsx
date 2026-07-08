import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import type { ReactNode } from 'react'

export interface ReportSectionProps {
  icon: SvgIconComponent
  title: string
  subtitle?: string
  defaultExpanded?: boolean
  children: ReactNode
}

export default function ReportSection({
  icon: Icon,
  title,
  subtitle,
  defaultExpanded = false,
  children,
}: ReportSectionProps) {
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Icon sx={{ color: 'text.secondary', fontSize: 22 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  )
}
