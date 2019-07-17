import { Component, Input, NgZone, AfterViewInit, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatSort } from '@angular/material';
import { IpcRendererService } from "app/core/electron/ipcrenderer.service";
import { Game } from "app/core/classes/game";
import { Plugin } from "app/core/classes/plugin";
import { GameService } from 'app/core/service/game.service';
import { TabGameService} from 'app/core/service/tab-game.service';
import { Rune } from './Interfaces/Rune';

@Component({
    selector: 'component-rune',
    templateUrl: './rune.component.html',
    styleUrls: ['./rune.component.scss'],
})
export class RuneComponent implements OnInit {
    public columnNames = [
        { id: "itemName", value: "Item name" },
        { id: "type", value: "Type" },
        { id: "runePrice", value: "Final Rune Price" },
        { id: "craftRunePrice", value: "Craft Rune Price" },
        { id: "runeType", value: "Rune type" },
        { id: "theoricalObtentionRate", value: "Theorical Optention Rate" },
        { id: "ingredientPrice", value: "Ingredient Price" },
        { id: "subCraft", value: "Sub craft" },
        { id: "reciepeFormula", value: "Reciepe Formula" },
        { id: "runeMarginAftTax", value: "Rune Margin After Tax" },
        { id: "runeInvestmentRatio", value: "Rune Investment ratio" },
        // { id: "tryNb", value: "Try Nb" },
        // { id: "empiricalObtentionRate", value: "Empirical Obtention Rate" },
        // { id: "success", value: "Succès" },
    ];
    public runes: any[] = [
        { name: 'All', value: 0 },
        { name: 'Rune Ga Pa', value: 'Rune Ga Pa' },
        { name: 'Rune Ga Pme', value: 'Rune Ga Pme' },
        { name: 'Rune Po', value: 'Rune Po' },
    ];

    MainTitle = 'Rune Bot';
    game: Game;
    plugin: Plugin;
    DicByName: { [id: string] : any; } = {};
    DicById: { [id: string] : any; }= {};
    missing: number = 0;
    OriginalData: Rune[];
    RunePriceText = 'Start Rune Price';
    RunePriceStatus = 'Stoped';
    // table
    dataSource: MatTableDataSource<Rune>;
    cachedMonsterDatasource: Rune[];
    @ViewChild(MatSort) sort: MatSort;
    displayedColumns = [];
    AllInOneMode: boolean = false;
    // buttons
    ReadRuneFileDisabled: boolean = false;
    UpdateIngredientPriceDisabled: boolean = false
    UpdateMarginDisabled: boolean = false;    
    AllInOneDisabled: boolean = false;

    constructor(
        private ipcRendererService: IpcRendererService,
        private gameService: GameService,
        private tabGameService: TabGameService,
        private http: HttpClient
    ){
    }

    ngOnInit() {
        this.displayedColumns = this.columnNames.map(x => x.id);
        this.game = this.gameService.games[0]; // first tab
        this.readRuneCsvReply();
        this.createTables([]);
        this.onReadRuneFile();
    }

    updateAutologinFirstGame() { // when using autologin, must set the first tab, because it is undefined
        this.game = this.gameService.games[0];
    }

    // buttons
    onAllInOne() {
        try {
            this.AllInOneMode = true;
            // this.AllInOneDisabled = true;
            this.onReadRuneFile();
        } catch(e) {
            // this.AllInOneDisabled = false;
            this.AllInOneMode = false;
            this.print(e);
        }
    }

    onReadRuneFile() {
        this.ReadRuneFileDisabled = true;
        try {
            this.ipcRendererService.send('read-rune-csv', null);
        } catch(e) {
            this.ReadRuneFileDisabled = false;
            this.print(`${e}`);
        }
    }

    readRuneCsvReply() {
        this.ipcRendererService.on('read-rune-csv-reply', (event: Event, csv: string) => {
            try {
                // 1. read data
                let dataFromCsv = csv.replace(/^\s*\n/gm, '').split('\n');
                if (dataFromCsv.length <= 1)
                    return;

                // 2. Create a dictionnary of <name, data>
                let dic = {};
                let allKeys = dataFromCsv[0].split(';');
                for (let i = 1; i <= dataFromCsv.length - 1; i++) {
                    let element: any = {};
                    if (!dataFromCsv[i])
                        continue;
                    let array = dataFromCsv[i].split(';');
                    for (let j = 0; j <= allKeys.length - 1; j++) {
                        let key = allKeys[j];
                        let value = array[j];
                        element[key] = value;
                    }
                    dic[element.itemName] = element;
                }

                // 3. Fill empty fields
                let res : Rune[] = [];
                for (let key in dic) {
                    let rune: Rune = dic[key];
                    rune.empiricalObtentionRate = rune.tryNb ? Math.round((rune.success || 0) / rune.tryNb * 100) / 100 : 0;
                    res.push(dic[key]);
                }
                let loaded = res.length;
                this.createTables(res);
                this.print(`import-csv-reply : ${loaded}/${this.dataSource.data.length} items imported.`, false);

                // 4. Update rune id
                this.updateRuneId();
                this.ReadRuneFileDisabled = false;
            } catch (ex) {
                this.print(ex);
            }
        });
    }

    updateRuneId() {
        this.dofusAPI({ class: 'Items' }, allItems => {
            this.DicById = allItems;
            this.DicByName = {};
            for (let id in allItems)
                if (allItems.hasOwnProperty(id))
                this.DicByName[allItems[id].nameId] = {'id' : id, 'details' : allItems[id]};

            for (let item of this.dataSource.data)
                if (this.DicByName[item.itemName]) {
                    item.itemId = this.DicByName[item.itemName].id;
                    item.details = this.DicByName[item.itemName].details;
                    item.typeId = item.details.typeId;
                } else
                    this.print(`Can't find in dic : ${item.itemName}`);
            if (!this.game)
                this.updateAutologinFirstGame();
            if (this.AllInOneMode)
                this.onUpdateIngredientPrice();
        });
    }

    onUpdateIngredientPrice() {
        try {
            // Filter reciepes with this.ItemDictionnary
            this.UpdateIngredientPriceDisabled = true;
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) {
                this.print(`The first tab must be loged in !`);
                this.UpdateIngredientPriceDisabled = false;
                return;
            }
            let { AvgPriceById, RecipesById } = TradingBot;
            if (!AvgPriceById) {
                this.print(`Please log in again. AvgPriceById from TradingBot is undefined.`);
                this.UpdateIngredientPriceDisabled = false;
                return;
            }
            this.filterReciepes(AvgPriceById, RecipesById);
            this.UpdateIngredientPriceDisabled = false;
        } catch(e) {
            this.print(`${e}`);
            this.UpdateIngredientPriceDisabled = false;
        }
    }
    
    filterReciepes(AvgPriceById, RecipesById) {
        for (let index = 0; index <= this.dataSource.data.length - 1; index++) {
            let item = this.dataSource.data[index];
            let resultId = item.itemId;
            let priceIngredients = 0;
            let formulasReciepe = [];
            let reciepeFormula = '';
            let reciepe = RecipesById[resultId];

            // 1. Update formula reciepe
            if (reciepe) {
                let { ingredientIds, quantities } = reciepe;
                for (let i = 0; i <= ingredientIds.length - 1; i++) {
                    let ingredientPrice = 0, nameId = '';
                    let ingredientId = ingredientIds[i];
                    let quantity = quantities[i];
                    let ingredient = this.DicById[ingredientId];
                    if (ingredient === undefined) {
                        this.print(`error: ingredient not found : id= ${ingredientId}`);
                        nameId = '???';
                    } else {
                        ingredientPrice = AvgPriceById[ingredientId];
                        nameId = ingredient.nameId;
                        priceIngredients += ingredientPrice * quantity;
                    }
                    formulasReciepe.push({ price: ingredientPrice, quantity: quantity, nameId: nameId, ingredientId: ingredientId });
                }
                if (formulasReciepe.length >= 1) {
                    reciepeFormula = priceIngredients + 'k = ' + formulasReciepe.map(
                        elem => '[' + elem.nameId + '](' + elem.price + ' * ' + elem.quantity + ')'
                    ).join(' + ');
                }
                if (!item) {
                    this.print(`error: item not found : id= ${resultId}`);
                    continue;
                }
            }

            // 2. Updating angular table
            item.ingredientPrice = priceIngredients;
            item.craftRunePrice = Math.round(item.ingredientPrice * (100 / item.theoricalObtentionRate));
            item.reciepeFormula = reciepeFormula;
            item.formulasReciepe = formulasReciepe;
            if (!item.details)
                continue;
            item.typeId = item.details.typeId;
            item.type = this.game.window.gui.databases.ItemTypes[item.typeId].nameId;
            item.level = item.details.level;
            item.recipeSlots = item.details.recipeSlots;
            item.ratio = (priceIngredients === 0 || !item.finalItemPrice) ? 0 : Math.round(item.finalItemPrice / priceIngredients* 100);
        }
        if (this.AllInOneMode)
            this.onUpdateRunePrice();
    }

    onUpdateRunePrice() { // l'id est requis. Faire le onUpdateIngredientPrice en premier pour réutiliser l'id.
        if (this.RunePriceStatus === 'Stoped') {
            this.RunePriceStatus = 'Running';
            this.RunePriceText = 'Pause Rune Price';
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) {
                this.print(`The first tab must be loged in !`);
                this.stopRunePrice();
                return;
            }
            let list: Rune[] = [];
            for (let i = 1; i <= this.runes.length - 1; i++) {
                let runeName = this.runes[i].value;
                let rune = this.DicByName[runeName];
                if (!rune) {
                    this.print(`Can't find in dic : ${runeName}`);
                    continue;
                }
                list.push(rune);
            }

            if (list.length === 0) {
                this.stopRunePrice();
                return;
            }
            let sleep = { sleepTime: 150, startRand: 0, endRand: 100 };
            this.UpdateRunePriceRec(list, 0, this.game.window.gui.playerData.position.mapId, sleep, null);
        } else {
            this.RunePriceStatus = this.RunePriceStatus === 'Running' ? 'Paused' : 'Running';
            this.RunePriceText = this.RunePriceStatus === 'Running' ? 'Pause Rune Price' : 'Resume Rune Price';
        }
    }

    UpdateRunePriceRec(list: any[], index: number, position: number, sleep, oldType:string) {
        // 1. Get itemNumber from index
        let rune = list[index];
        let { details, id, type } = rune;
        let { nameId, typeId } = details;

        // 2. Send web sockets
        let eventHandler: string = 'ExchangeTypesItemsExchangerDescriptionForUserMessage';
        this.onceCallback(eventHandler, index, list, sleep, position, nameId, type);
        if (index === 0)
            this.game.window.dofus.sendMessage('NpcGenericActionRequestMessage', {"npcId":0,"npcActionId":6,"npcMapId":position});
        if (oldType !== type)
            this.game.window.dofus.sendMessage('ExchangeBidHouseTypeMessage', {"type":typeId});
        this.game.window.dofus.sendMessage('ExchangeBidHouseListMessage', {"id":id});
    }

    onceCallback(eventHandler, index, list : any[], sleep, position, name, type:string) {
        this.game.window.dofus.connectionManager.once(eventHandler, async (msg: any) => {
            let {itemTypeDescriptions} = msg, firstPrice : number, nbHdv: number = 0;
            for (let i = 0; i <= itemTypeDescriptions.length - 1; i++) {
                let prices: number[] = itemTypeDescriptions[i].prices;
                let priceQty1: number = prices[0];
                if (!firstPrice || priceQty1 < firstPrice) {
                    firstPrice = priceQty1;
                    nbHdv = prices.length;
                }
            }

            if (firstPrice) { // Update all items which have the same name
                let itemsToUpdate = this.dataSource.data.filter(e => e.runeType === name);
                for (let i = 0; i <= itemsToUpdate.length - 1; i++) {
                    let item = itemsToUpdate[i];
                    if (item) {
                        item.finalItemPrice = firstPrice;
                        item.runePrice = firstPrice;
                        item.nbHdv = nbHdv;
                    }
                }
            }
            let priceString = (firstPrice ? (firstPrice + ' k, ') : '');
            let percent = Math.round(100 * index / (list.length - 1)) + '%, ';
            let timeLeft = Math.round(sleep.sleepTime * (list.length - 1 - index) / 1000) + 's';
            this.print(`${name} : ${priceString + percent + timeLeft}`);

            if (index <= list.length - 2){ // recursive because of once().
                let { sleepTime, startRand, endRand } = sleep;
                let randSleep = sleepTime + Math.floor(Math.random() * (endRand - startRand + 1) + startRand);
                await this.sleep(randSleep);
                while (this.RunePriceStatus === 'Paused')
                    await this.sleep(sleepTime);
                this.UpdateRunePriceRec(list, index + 1, position, sleep, type);
            }
            if (index === list.length - 1) { // finished
                if (!this.AllInOneMode)
                    this.onUpdateIngredientPrice(); // used for the export
                this.onUpdateMargin();
                this.RunePriceStatus = 'Stoped';
                this.RunePriceText = 'Start Rune Price';
                this.print(`${index + 1} runes scaned in ${sleep.sleepTime * index / 1000}s`);
                if (this.AllInOneMode)
                    this.onUpdateMargin();
            }
        });
    }

    stopRunePrice() {
        this.RunePriceStatus = 'Stoped';
        this.RunePriceText = 'Start Rune Price';
    }
    
    onUpdateMargin() {
        this.UpdateMarginDisabled = true;
        let data = this.dataSource.data.map(e => {
            // Rune margin
            if (e.runePrice && e.craftRunePrice) {
                let kav = e.runePrice * (e.theoricalObtentionRate / 100) * 0.97;
                e.runeMarginAftTax = Math.round(kav - e.ingredientPrice);
                e.runeInvestmentRatio = Math.round((e.runeMarginAftTax || 0) / (e.ingredientPrice || 1) * 100) / 100;
            } else {
                e.runeMarginAftTax = 9999999;
                e.runeInvestmentRatio = 0;
            }
            return e;
        });
        this.createTables(data);
        if (this.AllInOneMode) {
            this.AllInOneMode = false;
            this.AllInOneDisabled = false;
        }
        this.UpdateMarginDisabled = false;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dofusAPI(params, callback) {
        let url = 'https://proxyconnection.touch.dofus.com/data/map?lang=fr&v=&callback=?';
        return this.http.post(url, params).subscribe(callback);
    }

    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    createTables(tableArr: Rune[]) {
        this.dataSource = new MatTableDataSource(tableArr);
        this.dataSource.sort = this.sort;
    }

    onRuneChanged(event: any) {
        if (this.OriginalData === undefined) {
            this.OriginalData = this.dataSource.data;
            this.print(`${this.dataSource.data.length} items`, false);
        }
        let selected: string = event.value;
        if (event.value === 0) { // reset
            this.createTables(this.OriginalData);
            this.OriginalData = undefined;
        } else {
            let data = this.OriginalData.filter(e => e.runeType === selected);
            this.createTables(data);
            this.print(`${this.dataSource.data.length} items`, false);
        }
    }

    print(msg: string, notify: boolean = true) {
        console.log(msg);
        this.MainTitle = msg;
        if (notify)
            new Notification(msg);
    }
  }
