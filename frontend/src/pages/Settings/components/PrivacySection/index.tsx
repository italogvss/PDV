import { Box, CircularProgress } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import MarkdownRenderer from '../../../../components/MarkdownRenderer'
import { useLegalDocument } from '../../../../hooks/useLegalDocument'

export default function PrivacySection() {
  const { data: content } = useLegalDocument('politica-de-privacidade')

  return (
    <SettingCard
      title="Política de Privacidade"
      subtitle="Como tratamos os dados da sua conta e do seu negócio"
      maxContentHeight="calc(100vh - 320px)"
    >
      <Box sx={{ px: 4, py: 3 }}>
        {content ? (
          <MarkdownRenderer content={content} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
    </SettingCard>
  )
}
