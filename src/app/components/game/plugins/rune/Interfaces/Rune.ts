import {Item} from "../../trading/Interfaces/Item";

export class Rune extends Item {
    craftRunePrice: number; // The craft rune price
    empiricalObtentionRate: number; // Empirical rune obtention rate
    tryNb: number; // The number of tries
    runePrice: number; // The rune price
    runeType: string; // The rune type. Ex: GaPa
    success: number; // The number of sucess
    subCraft: string; // The sub craft
    theoricalObtentionRate: number; // The theorical obtention rate
    runeMarginAftTax: number; // The margin between ingredient price and the rune price after tax
    runeInvestmentRatio: number; // The investment ration in %. Includes taxes.
}
