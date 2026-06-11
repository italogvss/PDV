import { AccentColor } from "../../types/usersettings.type";

export type AccountTab =
  | 'perfil'
  | 'assinatura'
  | 'aparencia'
  | 'pagamentos'
  | 'faturas'
  | 'negocios'
  | 'seguranca'
  | 'notificacoes'
  | 'sessoes'
  | 'integracoes'

  //Apperance scetion

  export const ACCENT_COLORS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'green', label: 'Verde', hex: '#2fa040' },
  { id: 'blue', label: 'Azul', hex: '#3a82d4' },
  { id: 'orange', label: 'Laranja', hex: '#d97a1f' },
  { id: 'purple', label: 'Roxo', hex: '#9152d4' },
  { id: 'pink', label: 'Rosa', hex: '#d94576' },
  { id: 'graphite', label: 'Grafite', hex: '#4b4b4b' },
]