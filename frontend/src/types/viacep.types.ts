export interface ViaCepResponse {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  estado: string
  erro?: true
}

export interface Address {
  cep: string
  street: string
  neighborhood: string
  city: string
  state: string
  stateCode: string
}
