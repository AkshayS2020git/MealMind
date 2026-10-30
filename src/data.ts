export type Ingredient = {
  id: number
  name: string
  unit: string
  quantity: number
  cost: number
  expiry: string
  threshold: number
}

// The optional fourth value is the linked inventory ingredient ID. Older saved
// recipes without it remain supported and are matched by name and unit.
export type RecipePart = [string, number, string, number?]

export type MenuItem = {
  id: number
  name: string
  price: number
  recipe: RecipePart[]
}

export type Sale = {
  id?: number
  date: string
  item: string
  qty: number
  revenue?: number
}

export type WasteRecord = {
  id?: number
  date: string
  item: string
  qty: number
  unit: string
  reason: string
  cost: number
}

export type CustomForecast = {
  id: number
  name: string
  quantity: number
  baseline: number
  modelQuality: string
  ingredientRequirement: string
}

export type KnowledgeRecord = {
  id: number
  date: string
  topic: string
  details: string
}

export type RestaurantData = {
  ingredients: Ingredient[]
  menu: MenuItem[]
  sales: Sale[]
  waste: WasteRecord[]
  customForecasts?: CustomForecast[]
  knowledge?: KnowledgeRecord[]
}

export type Workspace = {
  id: string
  restaurant: string
  username: string
  ownerName: string
  email: string
  password: string
  data: RestaurantData
}

export const demoData: RestaurantData = {
  ingredients: [
    { id: 1, name: 'Tomatoes', unit: 'kg', quantity: 4.2, cost: 58, expiry: '2026-10-24', threshold: 5 },
    { id: 2, name: 'Paneer', unit: 'kg', quantity: 2.1, cost: 340, expiry: '2026-10-23', threshold: 2.5 },
    { id: 3, name: 'Basmati rice', unit: 'kg', quantity: 12, cost: 92, expiry: '2026-11-20', threshold: 5 },
    { id: 4, name: 'Fresh basil', unit: 'bunch', quantity: 3, cost: 28, expiry: '2026-10-22', threshold: 4 }
  ],
  menu: [
    { id: 1, name: 'Paneer Tikka Bowl', price: 349, recipe: [['Paneer', 0.18, 'kg'], ['Tomatoes', 0.12, 'kg'], ['Basmati rice', 0.15, 'kg']] },
    { id: 2, name: 'Tomato Basil Pasta', price: 299, recipe: [['Tomatoes', 0.25, 'kg'], ['Fresh basil', 0.2, 'bunch']] },
    { id: 3, name: 'Veggie Rice Bowl', price: 269, recipe: [['Basmati rice', 0.2, 'kg'], ['Tomatoes', 0.1, 'kg']] }
  ],
  sales: [
    { id: 1, date: '2026-10-21', item: 'Paneer Tikka Bowl', qty: 24, revenue: 8376 },
    { id: 2, date: '2026-10-21', item: 'Tomato Basil Pasta', qty: 17, revenue: 5083 },
    { id: 3, date: '2026-10-21', item: 'Veggie Rice Bowl', qty: 20, revenue: 5380 }
  ],
  waste: [
    { id: 1, date: '2026-10-21', item: 'Tomatoes', qty: 0.7, unit: 'kg', reason: 'Overripe', cost: 41 },
    { id: 2, date: '2026-10-20', item: 'Paneer', qty: 0.2, unit: 'kg', reason: 'Prep excess', cost: 68 }
  ],
  customForecasts: [],
  knowledge: []
}
