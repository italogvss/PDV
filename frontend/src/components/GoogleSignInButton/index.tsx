import { useEffect, useRef } from 'react'
import type { GoogleSignInButtonProps } from './types'

export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    let cancelled = false
    let intervalId: number | undefined

    function initialize() {
      const container = containerRef.current
      if (cancelled || !window.google || !container) return

      // Evita botões duplicados se o efeito reexecutar (ex.: StrictMode).
      container.replaceChildren()

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
        use_fedcm_for_prompt: true,
      })
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      })
      // One Tap: complemento opcional. Se o navegador suprimir o card,
      // o botão renderizado acima continua garantindo o login.
      window.google.accounts.id.prompt()
    }

    if (window.google) {
      initialize()
    } else {
      // O script gsi/client é carregado com async — aguarda ficar disponível.
      intervalId = window.setInterval(() => {
        if (window.google) {
          window.clearInterval(intervalId)
          initialize()
        }
      }, 100)
    }

    return () => {
      cancelled = true
      if (intervalId !== undefined) window.clearInterval(intervalId)
      window.google?.accounts.id.cancel()
    }
  }, [onCredential])

  return <div ref={containerRef} />
}
