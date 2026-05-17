import { Product, ProductCategory } from './types'

export const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'padaria', label: 'Padaria' },
  { value: 'lanches', label: 'Lanches' },
  { value: 'sobremesa', label: 'Sobremesa' },
]

export const PRODUCTS: Product[] = [
  { id: '1', name: 'Café espresso 50g',       price: 6.0,  category: 'bebidas',   imageColor: '#c9a37a' },
  { id: '2', name: 'Pão de queijo (unid.)',   price: 4.5,  category: 'padaria',   imageColor: '#e8d4a8' },
  { id: '3', name: 'Bolo de cenoura fatia',   price: 7.5,  category: 'padaria',   imageColor: '#e6a55c' },
  { id: '4', name: 'Refrigerante lata 350ml', price: 8.0,  category: 'bebidas',   imageColor: '#a8c5d4' },
  { id: '5', name: 'Suco natural laranja',    price: 9.0,  category: 'bebidas',   imageColor: '#f0a04b' },
  { id: '6', name: 'Sanduíche frango',        price: 16.0, category: 'lanches',   imageColor: '#d4a574' },
  { id: '7', name: 'Sanduíche vegetal',       price: 14.0, category: 'lanches',   imageColor: '#a8c994' },
  { id: '8', name: 'Salada Caesar',           price: 18.0, category: 'lanches',   imageColor: '#a8c594' },
  { id: '9', name: 'Brownie c/ sorvete',      price: 12.0, category: 'sobremesa', imageColor: '#6b4423' },
  { id: '10', name: 'Cookie chocolate',       price: 5.0,  category: 'sobremesa', imageColor: '#8b5a2b' },
  { id: '11', name: 'Água mineral 500ml',     price: 4.0,  category: 'bebidas',   imageColor: '#cfe6ec' },
  { id: '12', name: 'Cappuccino',             price: 8.5,  category: 'bebidas',   imageColor: '#b8946b' },
]

export const DISCOUNT_RATE = 0.05
