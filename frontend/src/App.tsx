import { RouterProvider } from 'react-router-dom'
import { Provider as ReduxProvider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/pt-br'
import { zeloTheme, loadGeistFont } from './theme'
import { router } from './router'
import { store } from './store'
import AuthProvider from './components/AuthProvider'
import { ToastProvider } from './context/ToastContext'

loadGeistFont()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={zeloTheme}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <CssBaseline />
            <AuthProvider>
              <ToastProvider>
                <RouterProvider router={router} />
              </ToastProvider>
            </AuthProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  )
}
