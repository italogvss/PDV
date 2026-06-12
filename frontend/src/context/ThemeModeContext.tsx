import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useAppSelector } from '../store'
import { createAppTheme } from '../theme'
import type { AccentColor, AppTheme } from '../types/usersettings.type'

interface PreviewState {
  mode?: AppTheme
  accent?: AccentColor
  textSize?: number
}

interface ThemeModeContextValue {
  /** Modo aplicado (preview ⊕ persistido). */
  mode: AppTheme
  /** Cor de destaque aplicada (preview ⊕ persistido). */
  accent: AccentColor
  /** Tamanho do texto aplicado (preview ⊕ persistido). */
  textSize: number
  /** Aplica um preview ao vivo, sem persistir. */
  setPreview: (preview: PreviewState) => void
  /** Descarta o preview e volta ao valor persistido. */
  resetPreview: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode deve ser usado dentro de ThemeModeProvider')
  return ctx
}

/**
 * Provê o tema do MUI de forma dinâmica: o valor persistido vem do Redux `auth`
 * (alimentado pelo /auth/me no login), e a tela de Aparência pode aplicar um
 * preview ao vivo. Substitui o <ThemeProvider> estático do App.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const persistedMode = useAppSelector((s) => s.auth.theme)
  const persistedAccent = useAppSelector((s) => s.auth.accentColor)
  const persistedTextSize = useAppSelector((s) => s.auth.textSize)
  const [preview, setPreviewState] = useState<PreviewState>({})

  // Sempre que o persistido muda (login, bootstrap ou save), descarta o preview.
  useEffect(() => {
    setPreviewState({})
  }, [persistedMode, persistedAccent, persistedTextSize])

  const mode = preview.mode ?? persistedMode
  const accent = preview.accent ?? persistedAccent
  const textSize = preview.textSize ?? persistedTextSize

  const theme = useMemo(() => createAppTheme(mode, textSize, accent), [mode, textSize, accent])

  // Estáveis: não dependem de mode/textSize, então não invalidam efeitos que os
  // usam como dependência (evita o "piscar" do preview).
  const setPreview = useCallback(
    (p: PreviewState) => setPreviewState((prev) => ({ ...prev, ...p })),
    [],
  )
  const resetPreview = useCallback(() => setPreviewState({}), [])

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, accent, textSize, setPreview, resetPreview }),
    [mode, accent, textSize, setPreview, resetPreview],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
