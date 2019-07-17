
export class Item {
    details?: any; // All item details, including type and id
    finalItemPrice: number; // The final item price
    reciepeFormula?: string; // The formula
    formulasReciepe?: any[]; // Array of ingredients
    ingredientPrice: number; // The ingredient price
    itemId: number; // The item id
    itemName: string; // The item name
    investmentRatio: number; // The investment ration in %. Includes taxes.
    lastSoldPrice: number[]; // The last item sold price
    level?: number; // The item level
    margin: number; // The kamas margin
    marginAftTax: number; // The kamas margin after tax
    nbHdv: number; // The number of items in hdv
    oneXpK?: any; // The job xp obtained by crafting one item
    quantity: number; // The quantity
    recipeSlots?: number; // The reciepe slot
    ratio?: number; // The investment ration in %. Without taxes.
    typeId?: number; // The item type id
    type?: string; // The item type. Ex: Ring
    unsold?: number; // Number of times this item was unsold
}
