import { Mods } from "../mods";
import { HttpClient } from '@angular/common/http';

export class TradingBot extends Mods{
    private http: HttpClient;

    constructor(
        wGame: any,
        http: HttpClient
    ) {
        super(wGame);
        this.http = http;
        this.wGame.dofus.TradingBot = {};
        let tradingBot = this.wGame.dofus.TradingBot;

        this.on(this.wGame.dofus.connectionManager, 'ObjectAveragePricesMessage', (msg: any) => {
            let AvgPriceById = {};
            for (let i = 0; i <= msg.ids.length - 1; i++) {
                let id = msg.ids[i];
                let price = msg.avgPrices[i];
                if (id)
                    AvgPriceById[id] = price;
            }
            tradingBot['AvgPriceById'] = AvgPriceById;
        });

        this.dofusAPI({ class: 'Recipes' }, Recipes => {
            let RecipesById = {};
            for (let key in Recipes)
                RecipesById[Recipes[key].resultId] = Recipes[key];
            tradingBot['RecipesById'] = RecipesById;
        });
    }

    dofusAPI(params, callback) {
        let url = 'https://proxyconnection.touch.dofus.com/data/map?lang=fr&v=&callback=?';
        return this.http.post(url, params).subscribe(callback);
    }
}
