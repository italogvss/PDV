export interface AddressEditFieldsProps {
  zipCode: string
  street: string
  number: string
  /** Recebe o CEP já mascarado. */
  onZipCodeChange: (value: string) => void
  onStreetChange: (value: string) => void
  onNumberChange: (value: string) => void
  /** Dispara a busca de endereço pelo CEP (ViaCEP). */
  onCepSearch: () => void
  searching: boolean
  cepError: string
  onCepErrorClear: () => void
}
