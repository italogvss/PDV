import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select
} from '@mui/material'
import { useRef, useState } from 'react'
import SettingCard from '../../../../components/SettingCard'
import SettingRow from '../../../../components/SettingRow'
import { useImportData } from '../../../../hooks/useImportData'
import { useToast } from '../../../../hooks/useToast'
import { reportService } from '../../../../services/report.service'
import { useAppSelector } from '../../../../store'
import { EXPORT_CATEGORIES, IMPORT_CATEGORIES } from '../../types'
import { useNavigate } from 'react-router'
import { Help } from '@mui/icons-material'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024 // 2 MB — espelha ImportLimits do backend

type ImportType = (typeof IMPORT_CATEGORIES)[number]['id']

export default function BackupSection() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [importType, setImportType] = useState<ImportType>('products')
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showToast = useToast()
  const importData = useImportData()
  const tenantId = useAppSelector((s) => s.auth.tenantId)
  const tenants = useAppSelector((s) => s.auth.tenants)
  const navigate = useNavigate()

  // Esta é a página de saída de quem perdeu o plano: a exportação continua liberada mesmo sem
  // assinatura, e é aqui que o prazo de exclusão precisa ficar explícito.
  const deletionAt = tenants.find((t) => t.tenantId === tenantId)?.scheduledDeletionAt

  const handleExport = async (categoryId: string) => {
    if (loadingId) return
    setLoadingId(categoryId)
    try {
      await reportService.exportCsv(categoryId)
    } catch {
      showToast('Erro ao exportar dados. Tente novamente.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reselecionar o mesmo arquivo
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Somente arquivos .csv são aceitos.', 'error')
      return
    }
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('O arquivo excede o tamanho máximo de 2 MB.', 'error')
      return
    }
    setImportFile(file)
  }

  const handleImport = () => {
    if (!importFile || importData.isPending) return
    importData.mutate(
      { type: importType, file: importFile },
      { onSuccess: () => setImportFile(null) },
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {deletionAt && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Exclusão agendada</AlertTitle>
          Esta loja e todo o seu histórico serão apagados definitivamente em{' '}
          <strong>{new Date(deletionAt).toLocaleDateString('pt-BR')}</strong>. Exporte o que precisar
          antes dessa data — depois dela, os dados não podem ser recuperados.
        </Alert>
      )}

      <SettingCard
        title="Importar dados"
        subtitle="Envie um arquivo .csv para cadastrar em lote."
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Help />} variant="outlined" onClick={() => navigate('/ajuda?cat=conta&art=importar-dados')}>Ajuda</Button>         
          <Button
            variant="contained"
            startIcon={
              importData.isPending ? <CircularProgress size={16} color="inherit" /> : <FileUploadOutlined />
            }
            disabled={!importFile || importData.isPending}
            onClick={handleImport}
          >
            Importar
          </Button>
          </Box>
        }
      >
        <SettingRow label="Tipo de dado" sublabel="O que este arquivo contém">
          <Select
            size="small"
            value={importType}
            onChange={(e) => setImportType(e.target.value as ImportType)}
            disabled={importData.isPending}
            sx={{ width: 220 }}
          >
            {IMPORT_CATEGORIES.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </SettingRow>

        <SettingRow label="Arquivo CSV" sublabel={importFile ? importFile.name : 'Nenhum arquivo selecionado'}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlined />}
            disabled={importData.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {importFile ? 'Trocar arquivo' : 'Selecionar arquivo'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={handleFileSelect}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Exportar dados" subtitle="Gera um arquivo com todos os registros em .csv">
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {EXPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isLoading = loadingId === cat.id
            return (
              <Button
                key={cat.id}
                variant="outlined"
                startIcon={<Icon />}
                endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlined />}
                disabled={!!loadingId}
                onClick={() => handleExport(cat.id)}
                sx={{
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  fontWeight: 500,
                  '& .MuiButton-endIcon': { marginLeft: 'auto' },
                }}
              >
                {cat.label}
              </Button>
            )
          })}
        </Box>
      </SettingCard>
    </Box>
    // <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    //   <SettingCard title="Backup automático" subtitle="Cópias de segurança agendadas">
    //     <SettingRow label="Ativar backup automático">
    //       <Switch
    //         checked={autoBackup}
    //         onChange={(e) => setAutoBackup(e.target.checked)}
    //         color="secondary"
    //       />
    //     </SettingRow>

    //     <SettingRow label="Frequência">
    //       <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
    //         <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
    //           <MenuItem value="daily">Diário</MenuItem>
    //           <MenuItem value="weekly">Semanal</MenuItem>
    //           <MenuItem value="monthly">Mensal</MenuItem>
    //         </Select>
    //       </FormControl>
    //     </SettingRow>

    //     <SettingRow label="Horário">
    //       <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
    //         <Select value={backupTime} onChange={(e) => setBackupTime(e.target.value)}>
    //           <MenuItem value="00:00">00:00</MenuItem>
    //           <MenuItem value="01:00">01:00</MenuItem>
    //           <MenuItem value="02:00">02:00</MenuItem>
    //           <MenuItem value="03:00">03:00</MenuItem>
    //           <MenuItem value="04:00">04:00</MenuItem>
    //         </Select>
    //       </FormControl>
    //     </SettingRow>

    //     <SettingRow label="Retenção">
    //       <FormControl size="small" sx={{ width: 200 }} disabled={!autoBackup}>
    //         <Select value={retention} onChange={(e) => setRetention(e.target.value)}>
    //           <MenuItem value="7">7 dias</MenuItem>
    //           <MenuItem value="14">14 dias</MenuItem>
    //           <MenuItem value="30">30 dias</MenuItem>
    //           <MenuItem value="90">90 dias</MenuItem>
    //         </Select>
    //       </FormControl>
    //     </SettingRow>
    //   </SettingCard>

    //   <SettingCard
    //     title="Backups recentes"
    //     action={
    //       <Button variant="outlined" size="small" startIcon={<FileDownloadOutlinedIcon />}>
    //         Baixar todos
    //       </Button>
    //     }
    //   >
    //     {BACKUPS.map((backup) => (
    //       <Box
    //         key={backup.id}
    //         sx={{
    //           display: 'flex',
    //           alignItems: 'center',
    //           justifyContent: 'space-between',
    //           px: 4,
    //           py: 2.5,
    //         }}
    //       >
    //         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    //           <Box
    //             sx={{
    //               width: 36,
    //               height: 36,
    //               borderRadius: 2,
    //               bgcolor: 'surface.raised',
    //               display: 'flex',
    //               alignItems: 'center',
    //               justifyContent: 'center',
    //             }}
    //           >
    //             <DatasetOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
    //           </Box>
    //           <Box>
    //             <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
    //               {backup.date}
    //             </Typography>
    //             <Typography variant="caption" color="text.secondary">
    //               {backup.size}
    //             </Typography>
    //           </Box>
    //         </Box>
    //         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    //           <Chip
    //             label={backup.status === 'success' ? 'Sucesso' : 'Falhou'}
    //             size="small"
    //             sx={
    //               backup.status === 'success'
    //                 ? { bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }
    //                 : { bgcolor: 'error.soft', color: 'error.ink', fontWeight: 600 }
    //             }
    //           />
    //           <IconButton size="small" disabled={backup.status === 'failed'}>
    //             <FileDownloadOutlinedIcon fontSize="small" />
    //           </IconButton>
    //         </Box>
    //       </Box>
    //     ))}
    //   </SettingCard>


    // </Box>
  )
}
