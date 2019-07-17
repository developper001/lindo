import { Component, Input, NgZone, AfterViewInit, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatSort } from '@angular/material';
import { IpcRendererService } from "app/core/electron/ipcrenderer.service";
import { Game } from "app/core/classes/game";
import { Plugin } from "app/core/classes/plugin";
import { GameService } from 'app/core/service/game.service';
import { TabGameService} from 'app/core/service/tab-game.service';
import { Archi } from './Interfaces/Archi';
import { BidExchangerObjectInfo } from './Interfaces/BidExchangerObjectInfo';
import { Monster } from './Interfaces/Monster';

@Component({
    selector: 'component-archi',
    templateUrl: './archi.component.html',
    styleUrls: ['./archi.component.scss'],
})
export class ArchiComponent implements OnInit {
    public columnNames = [
        { id: "archiName", value: "Nom de l'archi" },
        { id: "description", value: "Description" },
        { id: "sumPrices", value: "Prix total" },
        { id: "nbHdv", value: "Nb hdv" },
        // { id: "nbInMount", value: "Nb dans la monture" },
        // { id: "nbInHdv", value: "Nb en possession" },
        // { id: "nbInInventory", value: "Nb en possession" },
        { id: "nbArchi", value: "Mes archis" },
        { id: "minPrice", value: "Prix Min" },
        // { id: "avgPrice", value: "Prix moyen" },
        { id: "hdvPrices", value: "Liste des prix en hdv" },
        { id: "step", value: "Etape" },
    ];

    MainTitle = 'Archi Bot';
    game: Game;
    plugin: Plugin;
    monstersById : {[monsterId: number] : Monster };
    MissingArchi: number = 0;
    OcrePrice: string = '';
    OriginalData: Archi[];
    PdaInMount: number = 0;
    PdaInHdv: number = 0;
    PdaInInventory: number = 0;
    PdaTotal: number = 0;
    // table
    dataSource: MatTableDataSource<Archi>;
    cachedMonsterDatasource: Archi[];
    @ViewChild(MatSort) sort: MatSort;
    displayedColumns = [];
    AllInOneMode: boolean = false;
    MissingForNextOcre: number = 286;
    // buttons
    UpdatePdaDisabled: boolean = false;
    UpdateArchiFilterDisabled: boolean = false;
    UpdateArchiResetDisabled: boolean = false;
    CalculateOcrePriceDisabled: boolean = false;
    AllInOneDisabled: boolean = false;
    UpdateArchiNbDisabled: boolean = false;
    
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
        this.createTables([]); // create an empty list to avoid bug when acessing this.game
        this.importCsvArchiReply();
    }

    updateAutologinFirstGame() { // when using autologin, must set the first tab, because it is undefined
        this.game = this.gameService.games[0];
    }

    // buttons
    onPdaUpdate() {
        try {
            this.UpdatePdaDisabled = true;
            if (this.monstersById) {
                this.print(`Using Monster list from cache.`);
                this.openArchi(this.monstersById);
            }
            else // Update mob list when needed
                this.dofusAPI({ class: 'Monsters' }, Monsters => {
                    this.monstersById = Monsters;
                    this.print(`Monster list cache updated.`);
                    this.openArchi(this.monstersById);
                });
        } finally {
            this.UpdatePdaDisabled = false;
        }
    }

    onArchiFilter() {
        // this.UpdateArchiFilterDisabled = true;
        try {
            this.ipcRendererService.send('import-archi-csv', this.dataSource.data);
        } catch(e) {
            this.UpdateArchiFilterDisabled = false;
            this.print(`${e}`);
        }
    }

    onArchiReset() {
        this.UpdateArchiResetDisabled = true;
        this.createTables(this.cachedMonsterDatasource || []);
        this.MissingArchi = 0;
        this.print(`${this.cachedMonsterDatasource.length} monstres PDA.`);
        this.UpdateArchiResetDisabled = false;
    }

    // Trouve le nombre d'archis possédés
    onArchiNb() {
        try {
            this.UpdateArchiResetDisabled = true;
            this.updateAutologinFirstGame();
            let TradingBot = this.game.window.dofus.TradingBot;
            if (!TradingBot) {
                this.print(`The first tab must be loged in !`);
                this.UpdateArchiResetDisabled = false;
                return;
            }

            // Fermer l'hdv des archi
            if (this.AllInOneMode) {
                this.game.window.dofus.connectionManager.once('ExchangeLeaveMessage', async (msg: any) => {
                    this.UpdateArchiNb();
                });
                this.game.window.dofus.sendMessage('LeaveDialogRequestMessage', 
                null);
            } else
                this.UpdateArchiNb();
        }  catch(e) {
            this.print(`${e}`);
        } finally {
            this.UpdateArchiResetDisabled = false;
        }
    }

    // methods
    openArchi(monsterFromApi: { [monsterId: number]: Monster; }) { // Open the archi list. Open Trading, archi, pda.
        this.updateAutologinFirstGame();
        let TradingBot = this.game.window.dofus.TradingBot;
        if (!TradingBot) {
            this.print(`The first tab must be loged in !`);
            return;
        }

        this.game.window.dofus.connectionManager.once('ExchangeStartedBidBuyerMessage', async (msg: any) => {
            await this.sleep(300);
            let eventHandler = 'ExchangeTypesExchangerDescriptionForUserMessage';
            let oldListener = this.game.window.dofus.connectionManager.eventHandlers[eventHandler];
            var eventHandlers = this.game.window.dofus.connectionManager.eventHandlers;
            let cb = _ => {
                eventHandlers[eventHandler] = oldListener; // restore event listener
                if (this.AllInOneMode)
                    this.onArchiFilter();
            }
            this.game.window.dofus.connectionManager.once(eventHandler, async (msg: any) => {
                await this.sleep(300);
                this.game.window.dofus.connectionManager.once('ExchangeTypesItemsExchangerDescriptionForUserMessage', (msg) => {
                    let monstersFromArchiList : BidExchangerObjectInfo[] = msg.itemTypeDescriptions;
                    if (monstersFromArchiList.length === 0) {
                        this.print('Error : no Archi returned.');
                        return;
                    }
                    this.createArchiList(monsterFromApi, monstersFromArchiList, cb);
                });
                this.game.window.dofus.sendMessage('ExchangeBidHouseListMessage', 
                    {id: 10418}
                );
            });
            this.game.window.dofus.sendMessage('ExchangeBidHouseTypeMessage', { type : 85});

        });
        this.game.window.dofus.sendMessage('NpcGenericActionRequestMessage', {'npcId': 0, 'npcActionId': 6, 'npcMapId': this.game.window.gui.playerData.position.mapId});
    }

    // Create the archi list. Join MonsterApi and ArchiList.
    createArchiList(monsterDicFromApi: { [monsterId: number]: Monster; }, monstersFromArchiList: BidExchangerObjectInfo[], cb) {
        let archiRes : Archi[]= [];
        let archiDicByName: { [archiName: number]: Archi; } = {};
        for (var i = 0; i <= monstersFromArchiList.length - 1; i++) {
            let archi = monstersFromArchiList[i];
            let {effects} = archi;
            if (archi.prices.length !== 3) {
                this.print(`Error : the price list length must be 3 (1, 10, 100). Found ${archi.prices.length}`);
                continue;
            }
            let monsterPrice = archi.prices[0];

            // add all monsters to the dic
            for(var j = 0; j <= effects.length - 1; j++) {
                let monsterFromArchiList = effects[j];
                let diceConst = monsterFromArchiList.diceConst;
                let monster = monsterDicFromApi[diceConst];
                if (!monster) {
                    this.print(`Monstre PDA non trouvé : diceConst = ${monsterFromArchiList.diceConst}`);
                    continue;
                }
                let archi : Archi = archiDicByName[monster.nameId];
                if (!archi) {
                    archiDicByName[monster.nameId] = {
                        archiName: monster.nameId,
                        minPrice: monsterPrice,
                        sumPrices: monsterPrice,
                        avgPrice: monsterPrice,
                        hdvPrices: [monsterPrice],
                        step: 0,
                        diceConst: diceConst,
                    };
                } else {
                    archi.hdvPrices.push(monsterPrice);
                    archi.minPrice = Math.min(archi.minPrice || 0, monsterPrice || 0);
                    archi.sumPrices += monsterPrice;
                }
            }
        }

        for (var key in archiDicByName) {
            let archi = archiDicByName[key];
            archi.nbHdv = archi.hdvPrices ? archi.hdvPrices.length : 0;
            archi.avgPrice = Math.round((archi.nbHdv === 0) ? 0 : archi.sumPrices / archi.nbHdv);
            archiRes.push(archi);
        }

        this.createTables(archiRes);
        this.cachedMonsterDatasource = archiRes;
        this.print(`${archiRes.length} monstres PDA trouvés.`);
        cb();
        this.UpdatePdaDisabled = false;
    }

    importCsvArchiReply() {
        this.ipcRendererService.on('import-csv-archi-reply', (event: Event, csv: string) => {
            try {
                // 1. read data
                let dataFromCsv = csv.split('\n');
                if (dataFromCsv.length <= 1)
                    return;

                // 2. Create a dictionnary of <name, data>
                let dic = {};
                let allKeys = dataFromCsv[0].split(',');
                for (let i = 1; i <= dataFromCsv.length - 1; i++) {
                    let element: any = {};
                    if (!dataFromCsv[i])
                        continue;
                    let array = dataFromCsv[i].split(',');
                    for (let j = 0; j <= allKeys.length - 1; j++) {
                        let key = allKeys[j];
                        let value = array[j];
                        element[key] = value;
                    }
                    dic[element.archiName] = element;
                }
                
                // 3. Update required fields
                let newList: Archi[] = [];
                for (let i = 0; i <= this.dataSource.data.length - 1; i++) {
                    let archi = this.dataSource.data[i];
                    let archiInDic = dic[archi.archiName];
                    if (archiInDic) {
                        archi.step = archiInDic.step;
                        archi.description = archiInDic.description;
                        archiInDic.inList = true;
                        newList.push(archi);
                    }
                }

                // 4. Archi not in the list
                let archiNotInList: Archi[] = Object['values'](dic).filter(a => !a.inList);
                for (let i = 0; i <= archiNotInList.length - 1; i++) {
                    let archi = archiNotInList[i];
                    archi.minPrice = 0;
                    archi.nbHdv = 0;
                    archi.avgPrice = 0;
                    archi.sumPrices = 0;
                    newList.push(archi);
                }
                this.MissingArchi = archiNotInList.length;

                this.createTables(newList);
                this.print(`${newList.length - archiNotInList.length} archimonstres, ${this.MissingArchi} manquants (286 au total).`);
                this.UpdateArchiFilterDisabled = false;
                if (this.AllInOneMode)
                    this.onCalculateOcrePrice();
            } catch (ex) {
                this.print(ex);
            }
        });
    }

    onCalculateOcrePrice() {
        this.CalculateOcrePriceDisabled = true;
        let ocrePrice = 0;
        let data = this.dataSource.data;
        for (let i = 0; i <= data.length - 1; i++) {
            let minPrice = data[i].minPrice;
            ocrePrice += minPrice;
        }
        let formattedPrice = ocrePrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        this.OcrePrice = formattedPrice;
        this.CalculateOcrePriceDisabled = false;
        if (this.AllInOneMode)
            this.onArchiNb();
        else
            this.printFinalMsg();
    }

    UpdateArchiNb() {
        // Archis dans la dd, actualisation
        this.game.window.dofus.connectionManager.once('ExchangeStartedMountStockMessage', async (msg: any) => {
            let archisInMount = {};
            this.PdaInMount = this.UpdateArchiDic(msg, archisInMount);
            this.game.window.dofus.connectionManager.once('ExchangeStartedBidSellerMessage', (msg: any) => {
                // Archis en vente, actualisation
                let archisInHdv = {};
                this.PdaInHdv = this.UpdateArchiDic(msg, archisInHdv);
                let { belongings } = this.game.window.gui.playerData;
                
                // Archis en inventaire, cache
                let inventory = belongings._inventory.objects;
                let archisInInventory = {};
                this.PdaInInventory = this.UpdateArchiInInventory(inventory, archisInInventory);
                
                // Update rows
                let data = {
                    archisInMount: archisInMount,
                    archisInHdv: archisInHdv,
                    archisInInventory: archisInInventory
                };
                this.PdaTotal = this.PdaInMount + this.PdaInHdv + this.PdaInInventory;
                this.printFinalMsg();
                this.UpdateOwnedArchi(data);
            });
            this.game.window.dofus.sendMessage('NpcGenericActionRequestMessage', {'npcActionId': 5, 'npcId': 0, 'npcMapId': this.game.window.gui.playerData.position.mapId});
        });
        this.game.window.dofus.sendMessage('ExchangeRequestOnMountStockMessage', 
        {});
    }

    UpdateArchiInInventory(inventory: any, archiDic: any) {
        let archiNb = 0;
        for (let invenntoryKey in inventory) {
            let objectItem = inventory[invenntoryKey];
            if (!objectItem.item || objectItem.item.id != 10418)
                continue;
            let {effects} = objectItem;
            let addToPdaInMount = false;
            for (let keyEffect in effects) {
                let objectsInfo = effects[keyEffect];
                if (objectsInfo._type != 'EffectInstanceDice')
                    continue;
                let {value} = objectsInfo;
                archiDic[value] = archiDic[value] ? archiDic[value] + 1 : 1;
                addToPdaInMount = true;
            }
            if (addToPdaInMount)
                archiNb ++;
        }
        return archiNb;
    }

    // Actualiser le nombre d'archi possédés
    UpdateOwnedArchi(data) {
        let {archisInMount, archisInHdv, archisInInventory} = data;
        let count = this.dataSource.data.length;
        this.MissingForNextOcre = 286;
        for (let i = 0; i <= count - 1; i++) {
            let archi: Archi = this.dataSource.data[i];
            let { diceConst } = archi;
            archi.nbInMount = (archisInMount[diceConst] || 0);
            archi.nbInHdv = (archisInHdv[diceConst] || 0);
            archi.nbInInventory = (archisInInventory[diceConst] || 0);
            archi.nbArchi = archi.nbInMount + archi.nbInHdv + archi.nbInInventory;
            this.MissingForNextOcre -= archi.nbArchi >= 1 ? 1 : 0;
        }
        this.game.window.dofus.sendMessage('LeaveDialogRequestMessage', 
    null);
        if (this.AllInOneMode) {
            this.AllInOneMode = false;
            this.AllInOneDisabled = false;
        }
        this.UpdateArchiResetDisabled = false;
    }

    UpdateArchiDic(msg: any, archiDic: any) {
        let pdaInMount = 0;
        let {objectsInfos} = msg;
        for (let keyObjectsInfos in objectsInfos) {
            let objectItem = objectsInfos[keyObjectsInfos];
            let {effects} = objectItem;
            let addToPdaInMount = false;

            // fill dict with all effects (all monsters in a pda)
            for (let keyEffect in effects) {
                let objectsInfo = effects[keyEffect];
                if (objectsInfo._type != 'ObjectEffectDice')
                    continue;
                let {diceConst} = objectsInfo;
                archiDic[diceConst] = archiDic[diceConst] ? archiDic[diceConst] + 1 : 1;
                addToPdaInMount = true;
            }
            if (addToPdaInMount)
                pdaInMount ++;
        }
        return pdaInMount;
    }

    onAllInOne() {
        try {
            this.AllInOneMode = true;
            // this.AllInoneDisabled = true;
            this.onPdaUpdate();
        } catch(e) {
            this.AllInOneDisabled = false;
            this.AllInOneMode = false;
            this.print(e);
        }

    }

    onFilterNbHdvChanged(event: any) {
        if (this.OriginalData === undefined)
            this.OriginalData = this.dataSource.data;
        let userInput = event.target.value;
        let filterSelected: number = parseInt(userInput);
        if (isNaN(filterSelected)) { // reset
            this.createTables(this.OriginalData);
            this.OriginalData = undefined;
        } else {
            let data = this.OriginalData.filter(archi => archi.nbHdv === filterSelected);
            this.createTables(data);
        }
        this.print(`${this.dataSource.data.length} archis`, false);
    }

    printFinalMsg() {
        this.print(`Ocre: ${this.OcrePrice} K, Manque Hdv: ${this.MissingArchi} (286 au total), Mount: ${this.PdaInMount}, Hdv: ${this.PdaInHdv}, Inventory: ${this.PdaInInventory}, Tous mes archis: ${this.PdaTotal}, Manquants pour le prochain ocre : ${this.MissingForNextOcre}.`);
    }

    async sleep(ms) {
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

    createTables(tableArr: Archi[]) {
        this.dataSource = new MatTableDataSource(tableArr);
        this.dataSource.sort = this.sort;
    }

    print(msg: string, notify: boolean = true) {
        console.log(msg);
        this.MainTitle = msg;
        if (notify)
            new Notification(msg);
    }
  }
