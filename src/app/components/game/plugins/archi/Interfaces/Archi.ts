
export interface Archi {
    archiName: string,
    minPrice: number,
    sumPrices: number,
    avgPrice: number,
    step: number, // Etape de la quete
    description: string,
    hdvPrices: number[], // Tous les prix en hdv
    nbHdv: number, // Nombre d'archi en vente
    diceConst: number, // Jointure entre le prix des archis et le nom des archis

    nbArchi: number, // Nombre total d'archis en possession
    nbInMount: number, // Nombre d'archis sur la dd
    nbInHdv: number, // Nombre d'archis en hdv
    nbInInventory: number, // Nombre d'archis dans l'inventaire
}
