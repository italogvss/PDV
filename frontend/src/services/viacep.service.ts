import axios from 'axios'
import type { ViaCepResponse, Address } from '../types/viacep.types'

const CEP_REGEX = /^\d{8}$/

const viacepClient = axios.create({
  baseURL: 'https://viacep.com.br/ws',
})

function mapAddress(data: ViaCepResponse): Address {
  return {
    cep: data.cep,
    street: data.logradouro,
    neighborhood: data.bairro,
    city: data.localidade,
    state: data.estado,
    stateCode: data.uf,
  }
}

export const viacepService = {
  lookup: async (cep: string): Promise<Address> => {
    const digits = cep.replace(/\D/g, '')

    if (!CEP_REGEX.test(digits)) {
      throw new Error('CEP inválido. Informe exatamente 8 dígitos numéricos.')
    }

    const { data } = await viacepClient.get<ViaCepResponse>(`/${digits}/json/`)

    if (data.erro) {
      throw new Error('CEP não encontrado.')
    }

    return mapAddress(data)
  },
}
