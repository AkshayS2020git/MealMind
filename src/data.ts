export type Ingredient = { id: number; name: string; unit: string; quantity: number; cost: number; expiry: string; threshold: number }
export type RecipePart = [string, number, string]
export type MenuItem = { id: number; name: string; price: number; recipe: RecipePart[] }
export type Sale = { date: string; item: string; qty: number }
export type WasteRecord = { date: string; item: string; qty: number; unit: string; reason: string; cost: number }
export type RestaurantData = { ingredients: Ingredient[]; menu: MenuItem[]; sales: Sale[]; waste: WasteRecord[] }

export const demoData: RestaurantData = {
  ingredients: [
    { id: 1, name: 'Tomatoes', unit: 'kg', quantity: 4.2, cost: 58, expiry: '2026-10-24', threshold: 5 },
    { id: 2, name: 'Paneer', unit: 'kg', quantity: 2.1, cost: 340, expiry: '2026-10-23', threshold: 2.5 },
    { id: 3, name: 'Basmati rice', unit: 'kg', quantity: 12, cost: 92, expiry: '2026-11-20', threshold: 5 },
    { id: 4, name: 'Fresh basil', unit: 'bunch', quantity: 3, cost: 28, expiry: '2026-10-22', threshold: 4 }
  ],
  menu: [
    { id: 1, name: 'Paneer Tikka Bowl', price: 349, recipe: [['Paneer', .18, 'kg'], ['Tomatoes', .12, 'kg'], ['Basmati rice', .15, 'kg']] },
    { id: 2, name: 'Tomato Basil Pasta', price: 299, recipe: [['Tomatoes', .25, 'kg'], ['Fresh basil', .2, 'bunch']] },
    { id: 3, name: 'Veggie Rice Bowl', price: 269, recipe: [['Basmati rice', .2, 'kg'], ['Tomatoes', .1, 'kg']] }
  ],
  sales: [{ date: '2026-10-21', item: 'Paneer Tikka Bowl', qty: 24 }, { date: '2026-10-21', item: 'Tomato Basil Pasta', qty: 17 }, { date: '2026-10-21', item: 'Veggie Rice Bowl', qty: 20 }],
  waste: [{ date: '2026-10-21', item: 'Tomatoes', qty: .7, unit: 'kg', reason: 'Overripe', cost: 41 }, { date: '2026-10-20', item: 'Paneer', qty: .2, unit: 'kg', reason: 'Prep excess', cost: 68 }]
}
