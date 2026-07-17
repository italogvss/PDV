import { Box, CircularProgress } from '@mui/material'
import PageHeader from '../../../components/PageHeader'
import { useAdminLegalDocuments } from '../../hooks/useAdmin'
import LegalDocumentCard from './components/LegalDocumentCard'

export default function AdminLegalDocumentsPage() {
  const { data = [], isLoading } = useAdminLegalDocuments()

  const terms = data.find((d) => d.type === 'TermsOfUse')
  const privacy = data.find((d) => d.type === 'PrivacyPolicy')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Documentos Legais"
        description="Termos de Uso e Política de Privacidade exibidos no app e na landing page."
        showHelp={false}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {terms && (
            <LegalDocumentCard
              title="Termos de Uso"
              subtitle="Exibido em /termos-de-uso e nas Configurações do app."
              document={terms}
            />
          )}
          {privacy && (
            <LegalDocumentCard
              title="Política de Privacidade"
              subtitle="Exibida em /politica-de-privacidade e nas Configurações do app."
              document={privacy}
            />
          )}
        </Box>
      )}
    </Box>
  )
}
