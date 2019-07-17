import { Component, Input, NgZone, AfterViewInit, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatSort } from '@angular/material';
import { IpcRendererService } from "app/core/electron/ipcrenderer.service";
import { Game } from "app/core/classes/game";
import { GameService } from 'app/core/service/game.service';
import { TabGameService} from 'app/core/service/tab-game.service';
import { ReciepeComponent } from './reciepe/reciepe.component';
import { FileReader } from './fileReader/fileReader';
import { Item } from './Interfaces/Item';

@Component({
    selector: 'component-trading',
    templateUrl: './trading.component.html',
    styleUrls: ['./trading.component.scss'],
})
export class TradingComponent implements OnInit {
    public columnNames = [
        { id: "itemName", value: "Item" },
        { id: "type", value: "Type" },
        { id: "unsold", value: "Unsold" },
        { id: "lastSoldPrice", value: "Last Sold Prices" },
        { id: "nbHdv", value: "Nb en Hdv" },
        { id: "investmentRatio", value: "Investment ratio" },
        { id: "ingredientPrice", value: "Ingredient Price" },
        { id: "finalItemPrice", value: "Final Item Price" },
        { id: "marginAftTax", value: "Margin After Tax" },
    ];
    public persos: any[] = [
        { name: 'All', jobs: 0 },
        { name: 'Iop (tailleur, bijoutier)', jobs: [16, 17, 1, 9] },
        { name: 'Eca (cordo, baton, marteaux)', jobs: [10, 11, 4, 7] },
        { name: 'Cra (epée, pelle)', jobs: [6, 8] },
        { name: 'Enu (hache, dague)', jobs: [5, 19] },
        { name: 'Panda (arc, baguette)', jobs: [2, 3] }
    ];
    public XpMetier = {1: 0, 2: 15, 3: 37, 4: 75, 5: 150, 6: 375, 7: 750, 8: 1500};
    
    DicByName: { [id: string] : any; } = {};
    DicById: { [id: string] : any; }= {};
    UpdateFinalItemPriceStatus = 'Stoped';
    FinalItemPriceText = 'Start Final Item Price';
    MainTitle = 'Tradding Bot';
    ObjectsInSale: any[] = [];
    OriginalData: Item[];
    game: Game;
    @ViewChild(ReciepeComponent) reciepeComponent:ReciepeComponent;
    FileReader: FileReader = new FileReader();
    // table
    dataSource: MatTableDataSource<Item>;
    @ViewChild(MatSort) sort: MatSort;
    displayedColumns = [];
    selection = new SelectionModel<Item>(true, []);
    filterValue = '';
    AllInOneMode: boolean = false;
    // buttons
    UpdateSellHistoryDisabled: boolean = false;
    UpdateIngredientPriceDisabled: boolean = false;
    UpdateMarginDisabled: boolean = false;
    SaveDataDisabled: boolean = false;
    ImportDataDisabled: boolean = false;
    FilterFromHdvDisabled: boolean = false;
    UpdateSelectedDisabled: boolean = false;
    UpdateBankTransfertDisabled: boolean = false;
    AutoToggleDisabled: boolean = false;
    AllInOneDisabled: boolean = false;
    CancelFilterDisabled: boolean = false;
    
    constructor(
        private ipcRendererService: IpcRendererService,
        private gameService: GameService,
        private tabGameService: TabGameService,
        private http: HttpClient
    ){
    }

    ngOnInit() {
        this.displayedColumns = this.columnNames.map(x => x.id);
        this.displayedColumns.unshift("select");
        this.updateSellHistoryReply();
        this.importCsvReply();
        this.ipcExportCsvReply();
        this.ipcRendererService.send('update-sell-history');
        this.game = this.gameService.getGame(1); // first tab
    }

    // buttons
    onUpdateSellHistory() {
        this.UpdateSellHistoryDisabled = true;
        this.ipcRendererService.send('update-sell-history');
    }

    onUpdateIngredientPrice() {
        try {
            // 1. Get all reciepes only once. (tradingBot.ts ?)
            this.UpdateIngredientPriceDisabled = true;
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) {
                this.print(`The first tab must be loged in !`);
                this.UpdateIngredientPriceDisabled = false;
                return;
            }

            // 2. Filter reciepes with this.ItemDictionnary
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

    stopUpdateFinalItemPrice() {
        this.UpdateFinalItemPriceStatus = 'Stoped';
        this.FinalItemPriceText = 'Start Final Item Price';
    }

    onUpdateFinalItemPrice() { // l'id est requis. Faire le onUpdateIngredientPrice en premier pour réutiliser l'id.
        if (this.UpdateFinalItemPriceStatus === 'Stoped') {
            this.UpdateFinalItemPriceStatus = 'Running';
            this.FinalItemPriceText = 'Pause Final Item Price';
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) {
                this.print(`The first tab must be loged in !`);
                this.stopUpdateFinalItemPrice();
                return;
            }
            if (this.selection.selected.length > 0) // if some items are checked, only update them.
                this.dataSource.data = this.selection.selected;
            let list = this.dataSource.data
            .filter(e => !e.finalItemPrice) // price already known
            .sort((a, b) => { // sort by category
                if(a.type < b.type) return -1;
                if(a.type > b.type) return 1;
                return 0;
            })
            .filter((v, i, a) => a.indexOf(v) === i); // unique
            if (list.length === 0) {
                this.stopUpdateFinalItemPrice();
                return;
            }
            let sleep = { sleepTime: 150, startRand: 0, endRand: 100 };
            this.UpdateFinalItemPriceRec(list, 0, this.game.window.gui.playerData.position.mapId, sleep, null);
        } else {
            this.UpdateFinalItemPriceStatus = this.UpdateFinalItemPriceStatus === 'Running' ? 'Paused' : 'Running';
            this.FinalItemPriceText = this.UpdateFinalItemPriceStatus === 'Running' ? 'Pause Final Item Price' : 'Resume Final Item Price';
        }
    }

    onUpdateMargin() {
        this.UpdateMarginDisabled = true;
        let data = this.dataSource.data.map(e => {
            if (e.finalItemPrice && e.ingredientPrice) {
                e.margin = e.finalItemPrice - e.ingredientPrice;
                e.marginAftTax = Math.round(e.finalItemPrice * 0.97 - e.ingredientPrice);
                e.investmentRatio = Math.round((e.marginAftTax || 0) / (e.finalItemPrice || 1) * 100) / 100;
            } else {
                e.marginAftTax = 9999999;
                e.investmentRatio = 0;
            }
            return e;
        });
        this.createTables(data);
        if (this.AllInOneMode) {
            this.onAutoSelect();
        }
        this.UpdateMarginDisabled = false;
    }

    onFilterFromHdvInventoryBank() { // filter items in bank and in inventory
        try {
            this.FilterFromHdvDisabled = true;
            let { belongings } = this.game.window.gui.playerData;
            let eventHandler = 'ExchangeStartedBidSellerMessage';
            this.game.window.dofus.connectionManager.once(eventHandler, (msg: any) => {
                this.ObjectsInSale = msg.objectsInfos.map(e => e.objectGID + '');
                let count = this.dataSource.data.length;
                let data = this.dataSource.data.filter(e => {
                    let quantityInventory = belongings._inventory.quantityList[e.itemId];
                    let quantityBank = belongings._bankCache._countByGid[e.itemId];
                    let isInInventory = quantityInventory > 0;
                    let isInBank = quantityBank > 0;
                    let isInHdv = this.ObjectsInSale.includes(e.itemId);
                    return !isInHdv && !isInInventory && !isInBank;
                });
                this.createTables(data);
                if (this.OriginalData === undefined && this.dataSource.data) // backup to cancel filter, after filter is done (avoid empty margin)
                    this.OriginalData = this.dataSource.data;
                this.print(`${(count - this.dataSource.data.length )} items filtered !`);
                if (this.AllInOneMode)
                    this.onUpdateFinalItemPrice();
            });
            this.game.window.dofus.sendMessage('NpcGenericActionRequestMessage', {'npcActionId': 5, 'npcId': 0, 'npcMapId': this.game.window.gui.playerData.position.mapId});
        } catch(e) {
            this.print(`${e}`);
        } finally {
            this.FilterFromHdvDisabled = false;
        }
    }

    onPersoChanged(event: any) {
        if (this.OriginalData === undefined) {
            this.OriginalData = this.dataSource.data;
            this.print(`Tradding Bot : ${this.dataSource.data.length} items`, false);
        }
        let jobsSelected: number[] = event.value;
        if (event.value === 0) { // reset
            this.createTables(this.OriginalData);
            this.OriginalData = undefined;
        } else {
            let data = this.OriginalData.filter(e => (jobsSelected.includes(e.typeId)));
            this.createTables(data);
            this.print(`Tradding Bot : ${this.dataSource.data.length} items`, false);
        }
    }

    onUpdateSelected() {
        this.UpdateSelectedDisabled = true;
        this.onRowToggle();
        // Todo : update top 20 items with the real price
        this.UpdateSelectedDisabled = false;
    }

    async onBankTransfertSelected() {
        this.UpdateBankTransfertDisabled = true;
        this.reciepeComponent.bankTransfert(this);
        this.UpdateBankTransfertDisabled = false;
    }

    onAutoSelect() {
        try {
            this.AutoToggleDisabled = true;
            for (let i = 0; i <= this.dataSource.data.length - 1; i++) {
                let item = this.dataSource.data[i];
                // Sélection automatique des items avec un ratio < 0.2, une marge > 300 000k, prix ingredient < 3m5
                if ((item.investmentRatio >= 0.2 || item.investmentRatio === 0) &&
                    item.marginAftTax >= 300000 && (item.unsold <= item.lastSoldPrice.length) &&
                    item.unsold <= 3 && item.ingredientPrice <= 3500000)
                    this.selection.select(item);
            }
            this.onRowToggle();
            if (this.AllInOneMode) {
                this.AllInOneMode = false;
                this.AllInOneDisabled = false;
            }
        } finally {
            this.AutoToggleDisabled = false;

        }
    }
    

    UpdateFinalItemPriceRec(list: Item[], index: number, position: number, sleep, oldType:string) {
        // 1. Get itemNumber from index
        let itemName = list[index].itemName;
        let itemNumber = this.dataSource.data.findIndex(e => e.itemName === itemName);
        if (itemNumber < 0)
            return;
        let type = list[index].type;

        // 2. Search the prices
        let {itemId} = this.dataSource.data[itemNumber];
        let typeId: number = this.dataSource.data[itemNumber].details.typeId;

        // 3. Send web sockets
        let eventHandler: string = 'ExchangeTypesItemsExchangerDescriptionForUserMessage';
        this.onceCallback(eventHandler, index, list, sleep, position, itemName, type);
        if (index === 0)
            this.game.window.dofus.sendMessage('NpcGenericActionRequestMessage', {"npcId":0,"npcActionId":6,"npcMapId":position});
        if (oldType !== type)
            this.game.window.dofus.sendMessage('ExchangeBidHouseTypeMessage', {"type":typeId});
        this.game.window.dofus.sendMessage('ExchangeBidHouseListMessage', {"id":itemId});
    }

    onceCallback(eventHandler, index, list : Item[], sleep, position, name, type:string) {
        this.game.window.dofus.connectionManager.once(eventHandler, async (msg: any) => {
            let {itemTypeDescriptions} = msg, firstPrice : number, nbHdv: number = 0;
            for (let i = 0; i <= itemTypeDescriptions.length - 1; i++) {
                let prices: number[] = itemTypeDescriptions[i].prices;
                let priceQty1: number = prices[0];
                if (!firstPrice || priceQty1 < firstPrice) {
                    firstPrice = priceQty1;
                }
            }
            nbHdv = itemTypeDescriptions.length;

            if (firstPrice) { // Update all items which have the same name
                let itemsToUpdate = this.dataSource.data.filter(e => e.itemName === name);
                for (let i = 0; i <= itemsToUpdate.length - 1; i++) {
                    if (itemsToUpdate[i]) {
                        itemsToUpdate[i].finalItemPrice = firstPrice;
                        itemsToUpdate[i].nbHdv = nbHdv;
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
                while (this.UpdateFinalItemPriceStatus === 'Paused')
                    await this.sleep(sleepTime);
                this.UpdateFinalItemPriceRec(list, index + 1, position, sleep, type);
            }
            if (index === list.length - 1) { // finished
                if (!this.AllInOneMode)
                    this.onUpdateIngredientPrice(); // used for the export
                this.onUpdateMargin();
                this.UpdateFinalItemPriceStatus = 'Stoped';
                this.FinalItemPriceText = 'Start Final Item Price';
                this.print(`${index + 1} items scaned in ${sleep.sleepTime * index / 1000}s`);
            }
        });
    }

    filterReciepes(AvgPriceById, RecipesById) {
        for (let index = 0; index <= this.dataSource.data.length - 1; index++) {
            let item = this.dataSource.data[index];
            let resultId = item.itemId;
            let priceIngredients = 0;
            let formulasReciepe = [];
            let reciepe = RecipesById[resultId];
            let { ingredientIds, quantities } = reciepe;

            // 1. Update formula reciepe
            let reciepeFormula = '';
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
            // 2. Updating angular table
            item.ingredientPrice = priceIngredients;
            item.reciepeFormula = reciepeFormula;
            item.formulasReciepe = formulasReciepe;
            if (!item.details)
                continue;
            item.typeId = item.details.typeId;
            item.type = this.game.window.gui.databases.ItemTypes[item.typeId].nameId;
            item.level = item.details.level;
            item.recipeSlots = item.details.recipeSlots;
            if (item.recipeSlots) {
                let xpJob = this.XpMetier[item.recipeSlots];
                item.oneXpK = xpJob === 0 ? null : parseFloat((Math.round(priceIngredients / xpJob * 100) / 100) + '').toFixed(2);
            }
            item.ratio = (priceIngredients === 0 || !item.finalItemPrice) ? 0 : Math.round(item.finalItemPrice / priceIngredients* 100);
        }
        if (this.AllInOneMode)
            this.onFilterFromHdvInventoryBank();
    }

    onImportCsv() {
        this.ImportDataDisabled = true;
        try {
            this.ipcRendererService.send('import-csv', this.dataSource.data);
        } catch(e) {
            this.ImportDataDisabled = false;
            this.print(`${e}`);
        }
    }

    importCsvReply() {
        this.ipcRendererService.on('import-csv-reply', (event: Event, csv: string) => {
            // 1. read data
            let dataFromCsv = csv.split('\n');
            if (dataFromCsv.length <= 1)
                return;

            // 2. Create a dictionnary of <name, data>
            let dic: { [id: string] : Item; } = {};
            let allKeys = dataFromCsv[0].split(';');
            for (let i = 1; i <= dataFromCsv.length - 1; i++) {
                let element: any = {};
                let array = dataFromCsv[i].split(';');
                for (let j = 0; j <= allKeys.length - 1; j++) {
                    let key = allKeys[j];
                    let value = array[j];
                    element[key] = value;
                }
                dic[element.itemName] = element;
            }
            
            // 3. Update required fields
            this.selection.clear();
            let loaded = 0;
            for (let i = 0; i <= this.dataSource.data.length - 1; i++) {
                let elementToUpdate = this.dataSource.data[i];
                let newElement = dic[elementToUpdate.itemName];
                if (newElement) {
                    elementToUpdate.marginAftTax = newElement.marginAftTax;
                    this.selection.select(elementToUpdate);
                    loaded ++;
                }
            }
            this.ImportDataDisabled = false;
            this.print(`import-csv-reply : ${loaded}/${this.dataSource.data.length} items imported.`);
        });
    }

    onExportCsv() {
        this.SaveDataDisabled = true;
        try {
            let csvKeys = ['itemName', 'marginAftTax'];
            let data = this.selection.selected.length === 0 ? this.dataSource.data : this.selection.selected;
            this.ipcRendererService.send('export-csv', data, csvKeys);
        } catch(e) {
            this.print(`${e}`);
            this.SaveDataDisabled = false;
        }
    }

    ipcExportCsvReply() {
        this.ipcRendererService.on('export-csv-reply', (event: Event, path:any) => {
            let savedNb = this.selection.selected.length === 0 ? this.dataSource.data.length : this.selection.selected.length;
            this.print(`export-csv-reply : ${savedNb} items saved.`);
            this.SaveDataDisabled = false;
        });
    }
    
    updateSellHistoryReply() {
        this.ipcRendererService.on('update-sell-history-reply', (event: Event, data:any) => {
            this.FileReader.ParseFiles(data, this);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    switchToTab(tabNumber) {
        let firstGame = this.gameService.getGame(tabNumber);
        if (!firstGame)
            return;
        this.tabGameService.selectTabGame(tabNumber);
    }

    dofusAPI(params, callback) {
        let url = 'https://proxyconnection.touch.dofus.com/data/map?lang=fr&v=&callback=?';
        return this.http.post(url, params).subscribe(callback);
    }

    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
      }

    createTables(tableArr: Item[]) {
        this.dataSource = new MatTableDataSource(tableArr);
        this.dataSource.sort = this.sort;
    }

    isAllSelected() {
        return this.selection.selected.length === this.dataSource.data.length;
    }

    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    public onRowToggle() {
        try {
            if (!this.selection.selected)
                return;
            if (this.selection.selected.length === 0) {
                this.reciepeComponent.createTables([]);
                this.reciepeComponent.MainTitle = 'Reciepes';
                return;
            }
            this.filterValue = ''; // clear main filter
            this.applyFilter('');
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) { // not loged
                this.onUpdateIngredientPrice();
                return;
            }
            if (!this.selection.selected[0].formulasReciepe) // not clicked on UpdateIngredientPrice
                this.onUpdateIngredientPrice();
            this.reciepeComponent.updateReciepes(this);
        } catch (e) {
            this.print(e);
        }
    }

    onCancelFilter() {
        this.CancelFilterDisabled = true;
        if (this.OriginalData)
            this.dataSource.data = this.OriginalData;
        this.print(`Tradding Bot : ${this.dataSource.data.length} items`);
        this.CancelFilterDisabled = false;
    }

    onAllInOne() {
        try {
            // this.AllInOneDisabled = true;
            this.AllInOneMode = true;
            this.onUpdateSellHistory();
        } catch(e) {
            // this.AllInOneDisabled = false;
            this.AllInOneMode = false;
            this.print(e);
        }
    }

    numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    print(msg: string, notify: boolean = true) {
        console.log(msg);
        this.MainTitle = msg;
        if (notify)
            new Notification(msg);
    }

    updateAutologinFirstGame() { // when using autologin, must set the first tab, because it is undefined
        this.game = this.gameService.games[0];
    }
  }
