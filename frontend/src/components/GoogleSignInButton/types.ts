export interface GoogleSignInButtonProps {
  /** Chamado com o ID token (credential) assim que o usuário autentica no Google. */
  onCredential: (credential: string) => void
}
