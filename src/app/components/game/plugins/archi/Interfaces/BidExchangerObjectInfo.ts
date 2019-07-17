
export interface BidExchangerObjectInfo {
    prices: number[],
    objectUID: number,
    effects: any[], // the list of monsters in the pda. The last one is the archi.
    archiName: string
}
