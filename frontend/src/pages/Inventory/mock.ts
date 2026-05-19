import type { Product, ProductCategory } from '../../types/product.types'

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', tenantId: "1", name: 'Café espresso 50g',      barcode: '7891234560010', category: null,    costPrice: 12.00, price: 18.90, stock: 24,  minStock: 15, criticalStock: 6  },
  { id: '2', tenantId: "1", name: 'Pão de queijo (unid.)',   barcode: '7891234560027', category: null,    costPrice:  2.80, price:  4.50, stock: 132, minStock: 50, criticalStock: 15 },
  { id: '3', tenantId: "1", name: 'Bolo de cenoura fatia',   barcode: '7891234560034', category: null,    costPrice:  5.50, price:  9.00, stock: 18,  minStock: 15, criticalStock: 5  },
  { id: '4', tenantId: "1", name: 'Refrigerante lata 350ml', barcode: '7891234560041', category: null,    costPrice:  3.90, price:  6.50, stock: 86,  minStock: 30, criticalStock: 10 },
  { id: '5', tenantId: "1", name: 'Suco natural laranja',    barcode: '7891234560058', category: null,    costPrice:  7.00, price: 12.00, stock: 14,  minStock: 12, criticalStock: 4  },

  { id: '7', tenantId: "1", name: 'Sanduíche vegetal',       barcode: '7891234560072', category: null,    costPrice: 12.00, price: 19.50, stock:  4,  minStock: 15, criticalStock: 5  },
  { id: '8', tenantId: "1", name: 'Cookie chocolate',        barcode: '7891234560089', category: null, costPrice:  3.50, price:  6.00, stock: 48,  minStock: 20, criticalStock: 6  },
  { id: '9', tenantId: "1", name: 'Vitamina banana',         barcode: '7891234560096', category: null,    costPrice:  8.50, price: 14.50, stock: 22,  minStock: 12, criticalStock: 4  },
  { id: '10', tenantId: "1", name: 'Quiche lorraine',         barcode: '7891234560102', category: null,    costPrice:  7.00, price: 11.50, stock: 16,  minStock: 12, criticalStock: 4  },
]

export const MOCK_PRODUCT_CATEGORIES: ProductCategory[] =[
  {id: 1, name: 'Lanches', color: "#c52525"},
  {id: 2, name: 'Sobremesas', color: "#df9a1c"},
  {id: 3, name: 'Bebidas', color: "#098332"},
  {id: 4, name: 'Padaria', color: "#710fb3"}
]