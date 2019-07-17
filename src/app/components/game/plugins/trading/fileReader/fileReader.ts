import { TradingComponent } from 'app/components/game/plugins/trading/trading.component';
import { Item } from '../Interfaces/Item';

export class FileReader {
    ParseFiles(data: { ventesData: string, unsold: string }, tc: TradingComponent): any {
        let {ventesData, unsold: unsold} = data;

        // 1. Extract the sells (first set of lines separated by -----)
        let trimedSells = this.extractSells(ventesData, tc);
        let trimedUnsold = this.extractUnsold(unsold, tc);

        // 2. Parse each line
        this.parseEachLine(trimedSells, trimedUnsold, tc);

        // 3. Update ItemId
        this.updateItemId(tc);
        tc.print(`Tradding Bot : ${tc.dataSource.data.length} items`, false);
    }

    // 1. Extract the sells (first set of lines separated by -----)
    extractSells(ventesData: string, tc : TradingComponent) : string {
        if (!ventesData) return;
        let separator = '-- ';
        let index = ventesData.indexOf(separator);
        if (index <= 0) {
            tc.print(`read-input-reply : Can't find separator ${separator}`);
            return;
        }
        let subStr = ventesData.substr(0, index);
        if (!subStr) return;
        let trimed = subStr.trim();
        if (!trimed) return;
        return trimed;
    }
    extractUnsold(unsold: string, tc: TradingComponent): string {
        let trimed = unsold.trim();
        if (!trimed) return;
        return trimed;
    }

    // 2. Parse each line
    parseEachLine(trimed: string, trimedUnsold: string, tc: TradingComponent): void {
        let regex = new RegExp(/(Banque : \+ )(\d+)( Kamas \(vente de )(\d+)( )(.+?(?=(\))|( hors jeu)))(( hors jeu)?)(\)\.)/g);
        let match = regex.exec(trimed);
        let res : Item[] = [], history = [], dic: { [id: string] : any; } = {};
        while (match != null) {
            let lastSoldPrice = match[2];
            let quantity = match[4];
            let itemName = match[6];
            history.push({itemName: itemName, lastSoldPrice: lastSoldPrice, quantity: quantity});
            match = regex.exec(trimed);
        }
        for (let i = 0; i <= history.length - 1; i++) {
            let v = history[i];
            if (!dic[v.itemName]) {
                v.lastSoldPrice = [v.lastSoldPrice];
                dic[v.itemName] = v;
            }
            else if (dic[v.itemName].lastSoldPrice.length <= 4)
                dic[v.itemName].lastSoldPrice.push(v.lastSoldPrice);
        }
        // Unsold
        let unsoldDic = {};
        let arrayOfLines = trimedUnsold.match(/[^\r\n]+/g);
        for (let line of arrayOfLines) {
            let simplifiedKey = line.trim().replace(/\s/g, '').toLowerCase();
            unsoldDic[simplifiedKey] = unsoldDic[simplifiedKey] ? unsoldDic[simplifiedKey] + 1 : 1;
        }
        // result
        for (let key in dic) {
            let item = dic[key];
            let simplifiedKey = key.trim().replace(/\s/g, '').toLowerCase();
            let unsold = unsoldDic[simplifiedKey];
            item.unsold = unsold ? unsold : 0;
            res.push(item);
        }
        tc.createTables(res);
    }

    // 3. Update ItemId
    updateItemId(tc: TradingComponent) {
        tc.dofusAPI({ class: 'Items' }, allItems => {
            tc.DicById = allItems;
            tc.DicByName = {};
            for (let id in allItems)
                if (allItems.hasOwnProperty(id))
                tc.DicByName[allItems[id].nameId] = {'id' : id, 'details' : allItems[id]};

            for (let item of tc.dataSource.data)
                if (tc.DicByName[item.itemName]) {
                    item.itemId = tc.DicByName[item.itemName].id;
                    item.details = tc.DicByName[item.itemName].details;
                    item.typeId = item.details.typeId;
                } else
                    tc.print(`Can't find in dic : ${item.itemName}`);
            if (!tc.game)
                tc.updateAutologinFirstGame();
            if (tc.game.window.dofus.TradingBot) // only if loged in
                tc.onUpdateIngredientPrice();
            tc.UpdateSellHistoryDisabled = false;
        });
    }
}
