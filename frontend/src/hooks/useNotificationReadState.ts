import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '../store'
import type { NotificationItem } from '../types/notification.types'

// Estado de "lido" das notificações, por loja, no localStorage.
//
// Notificação aqui não é evento: é uma contagem que se refaz a cada poll. Então "lido" é
// guardado como uma ASSINATURA por item — `contagem:dia`. O item volta a não-lido só quando
// aquela contagem muda ou quando vira o dia; mexer no estoque não desmarca as despesas.
// (Antes a assinatura era o payload inteiro, então qualquer mudança apagava tudo.)
type ReadMap = Record<string, string>

function storageKey(tenantId: string) {
  return `notifications_read_${tenantId}`
}

// Dia local do navegador — `toISOString` seria UTC e viraria o dia às 21h no horário de Brasília.
function todayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

function signatureOf(item: NotificationItem): string {
  return `${item.count}:${todayKey()}`
}

function load(tenantId: string): ReadMap {
  if (!tenantId) return {}
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    return raw ? (JSON.parse(raw) as ReadMap) : {}
  } catch {
    return {}
  }
}

// Grava só as chaves ainda presentes no payload — sem a poda, o storage acumularia
// para sempre as notificações que já deixaram de existir.
function save(tenantId: string, map: ReadMap, liveKeys: string[]): void {
  if (!tenantId) return
  const pruned: ReadMap = {}
  for (const key of liveKeys) {
    if (map[key]) pruned[key] = map[key]
  }
  try {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(pruned))
  } catch {
    // Storage cheio ou bloqueado (aba anônima): o estado de leitura vale só nesta sessão.
  }
}

export function useNotificationReadState(items: NotificationItem[]) {
  const tenantId = useAppSelector((s) => s.auth.tenantId) ?? ''
  const [readMap, setReadMap] = useState<ReadMap>(() => load(tenantId))

  // Trocar de loja não desmonta o TopBar — sem isto o estado continuaria sendo o da loja anterior.
  useEffect(() => {
    setReadMap(load(tenantId))
  }, [tenantId])

  const readKeys = useMemo(
    () => new Set(items.filter((item) => readMap[item.key] === signatureOf(item)).map((i) => i.key)),
    [items, readMap],
  )

  const persist = useCallback(
    (next: ReadMap) => {
      setReadMap(next)
      save(tenantId, next, items.map((i) => i.key))
    },
    [tenantId, items],
  )

  const markRead = useCallback(
    (key: string) => {
      const item = items.find((i) => i.key === key)
      if (!item) return
      persist({ ...readMap, [key]: signatureOf(item) })
    },
    [items, readMap, persist],
  )

  const markAllRead = useCallback(() => {
    const next: ReadMap = { ...readMap }
    for (const item of items) next[item.key] = signatureOf(item)
    persist(next)
  }, [items, readMap, persist])

  return {
    readKeys,
    unreadCount: items.length - readKeys.size,
    markRead,
    markAllRead,
  }
}
