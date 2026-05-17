import type { Product } from './types'

export const MOCK_PRODUCTS: Product[] = [
  { id: '1',  name: 'Café espresso 50g',      barcode: '7891234560010', category: 'Bebidas',    costPrice: 12.00, price: 18.90, stock: 24,  minStock: 15, criticalStock: 6  },
  { id: '2',  name: 'Pão de queijo (unid.)',   barcode: '7891234560027', category: 'Padaria',    costPrice:  2.80, price:  4.50, stock: 132, minStock: 50, criticalStock: 15 },
  { id: '3',  name: 'Bolo de cenoura fatia',   barcode: '7891234560034', category: 'Padaria',    costPrice:  5.50, price:  9.00, stock: 18,  minStock: 15, criticalStock: 5  },
  { id: '4',  name: 'Refrigerante lata 350ml', barcode: '7891234560041', category: 'Bebidas',    costPrice:  3.90, price:  6.50, stock: 86,  minStock: 30, criticalStock: 10 },
  { id: '5',  name: 'Suco natural laranja',    barcode: '7891234560058', category: 'Bebidas',    costPrice:  7.00, price: 12.00, stock: 14,  minStock: 12, criticalStock: 4  },
  { id: '6',  name: 'Sanduíche frango',        barcode: '7891234560065', category: 'Lanches',    costPrice: 14.00, price: 22.00, stock:  9,  minStock: 15, criticalStock: 5  },
  { id: '7',  name: 'Sanduíche vegetal',       barcode: '7891234560072', category: 'Lanches',    costPrice: 12.00, price: 19.50, stock:  4,  minStock: 15, criticalStock: 5  },
  { id: '8',  name: 'Cookie chocolate',        barcode: '7891234560089', category: 'Sobremesas', costPrice:  3.50, price:  6.00, stock: 48,  minStock: 20, criticalStock: 6  },
  { id: '9',  name: 'Vitamina banana',         barcode: '7891234560096', category: 'Bebidas',    costPrice:  8.50, price: 14.50, stock: 22,  minStock: 12, criticalStock: 4  },
  { id: '10', name: 'Quiche lorraine',         barcode: '7891234560102', category: 'Padaria',    costPrice:  7.00, price: 11.50, stock: 16,  minStock: 12, criticalStock: 4  },
  { id: '11', name: 'Chips de banana',         barcode: '7891234560119', category: 'Sobremesas', costPrice:  4.50, price:  8.00, stock:  8,  minStock: 15, criticalStock: 5  },
  { id: '12', name: 'Água de coco 330ml',      barcode: '7891234560126', category: 'Outros',     costPrice:  5.50, price:  9.50, stock:  3,  minStock: 20, criticalStock: 6  },
]
