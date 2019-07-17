import { Component, Input, NgZone, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { IpcRendererService } from "app/core/electron/ipcrenderer.service";
import { Game } from "app/core/classes/game";
import { GameService } from 'app/core/service/game.service';
import { TabGameService} from 'app/core/service/tab-game.service';
import { HttpClient } from '@angular/common/http';
import { OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatSort } from '@angular/material';
import { TradingComponent } from 'app/components/game/plugins/trading/trading.component';
import { Item } from '../Interfaces/Item';

export interface ElementReciepe {
    nameId: string,
    ingredientId: number,
    quantity: number,
    totalQuantity: number,
    totalPrice: number,
    price: number,
    realPrice: number,
    toBuy: number,

    quantityInventory: number,
    quantityBank: number,
}

@Component({
    selector: 'component-reciepe',
    templateUrl: './reciepe.component.html',
    styleUrls: ['../trading.component.scss', './reciepe.component.scss']
})
export class ReciepeComponent implements OnInit {
    @ViewChild(MatSort) sort: MatSort;
    dataSource: MatTableDataSource<ElementReciepe>;
    displayedColumns = [];
    MainTitle = 'Reciepes';
    // buttons
    
    public columnNames = [
        { id: "nameId", value: "Item Name" },
        { id: "toBuy", value: "To Buy" },
        { id: "totalPrice", value: "Total Price" },
        { id: "price", value: "Unit Average Price" },
        { id: "realPrice", value: "Unit Real Price" },
        { id: "quantityInventory", value: "In Inventory" },
        { id: "quantityBank", value: "In Bank" },
        { id: "totalQuantity", value: "Quantity" },
    ];

    constructor(
        // private ipcRendererService: IpcRendererService,
    ){
    }

    ngOnInit() {
        this.displayedColumns = this.columnNames.map(x => x.id);
    }

    // buttons
    onUpdateSellHistory() {
        this.createTables([]);
    }

    // methods
    createTables(tableArr: any[]) {
        this.dataSource = new MatTableDataSource(tableArr);
        this.dataSource.sort = this.sort;
    }

    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    updateReciepes(tc : TradingComponent) {
        try {
            // 1. List all reciepes
            let selectedRows: any[] = tc.selection.selected;
            let res: ElementReciepe[] = [];
            let dic: { [id: string] : ElementReciepe; } = {};
            for (let i = 0; i <= selectedRows.length - 1; i++) {
                let formulasReciepe: ElementReciepe[] = selectedRows[i].formulasReciepe;
                if (!formulasReciepe) {
                    tc.print(`update ingredient price first. This may also be because ingredients where not in the bank before.`);
                    return;
                }
                for (let j = 0; j <= formulasReciepe.length - 1; j++) {
                    let element = formulasReciepe[j];
                    let oldElement = dic[element.nameId];
                    if (!oldElement) {
                        dic[element.nameId] = element;
                        dic[element.nameId].totalQuantity = element.quantity;
                    }
                    else
                        dic[element.nameId].totalQuantity += element.quantity;
                }
            }

            // 2. Update total price
            let { belongings } = tc.game.window.gui.playerData;
            let reciepesTotalPrice = 0;
            for (let key in dic) {
                let item = dic[key];

                // 3. update quantities
                item.quantityInventory = belongings._inventory.quantityList[item.ingredientId];
                item.quantityBank = belongings._bankCache._countByGid[item.ingredientId];
                let diff = (item.totalQuantity || 0) - (item.quantityInventory || 0);
                item.toBuy = (diff >= 0) ? diff : 0;
                item.totalPrice = item.price * item.toBuy;
                
                if (item.toBuy > 0) {
                    res.push(item);
                    reciepesTotalPrice += item.totalPrice;
                }
            }
            this.createTables(res);
            this.MainTitle = reciepesTotalPrice ? tc.numberWithCommas(reciepesTotalPrice) + ' k of ingredients' : 'Reciepes';
        } catch (e) {
            tc.print(`${e}`);
        }
    }

    updateSelected(tradingComponent : TradingComponent) {
        // just clicking on the button is enough to refresh
    }

    // Cape du Piou Rose
    // uid : 9 chiffres. Ex :
    // 1 Graine de Sésame 282478049
    // 1 Plume de Piou Rose 282245026
    // this.removeItem(282478049, -1, tradingComponent);
    async bankTransfert(tc : TradingComponent){
        if (!this.dataSource || this.dataSource.data.length === 0) {
            tc.print('bankTransfert : The Reciepes list is empty. At least one item must be selected and the reciepe list must not be empty.');
            return;
        }
        let gidByUid = tc.game.window.gui.playerData.belongings._bankCache._gidByUid;
        let countByGid = tc.game.window.gui.playerData.belongings._bankCache._countByGid;
        if (Object.keys(gidByUid).length === 0) {
            tc.print('The _gidByUid map is empty. Try to open the bank. Or the bank is empty.');
            return;
        }
        // 1. Get the dic of uid by gid
        let uidsByGid = this.getdicOfUidByGid(tc, gidByUid);
        
        // 2. Get the list of reciepe elements to transfert
        let uidToTransfert = this.getListReciepeElementsToTransfert(tc, uidsByGid, countByGid);

        // 3. Transfert all
        this.transfertAll(tc, countByGid, uidToTransfert);
    }

    // Get the dic of uid by gid
    getdicOfUidByGid(tc : TradingComponent, gidByUid) {
        let uidsByGid = {};
        for (let uid in gidByUid) {
            let gid = gidByUid[uid];
            if (!uidsByGid[gid])
                uidsByGid[gid] = [uid];
            else {
                uidsByGid[gid].push(uid);
                tc.print(`Warning : the gid ${gid} has many uid. Added ${uid}.`);
            }
        }
        return uidsByGid;
    }

    // Get the list of reciepe elements to transfert
    getListReciepeElementsToTransfert(tc : TradingComponent, uidsByGid, countByGid) {
        let uidToTransfert = [];
        for (let elementReciepe of this.dataSource.data) {
            let uids = uidsByGid[elementReciepe.ingredientId];
            if (!uids || uids.length === 0) {
                tc.print(`Warning : ${elementReciepe.nameId} has no uid (ingredientId = ${elementReciepe.ingredientId}).`, false);
                continue;
            }
            for (let uid of uids) {
                if (!uid)
                    continue;
                
                let quantityInBank = countByGid[elementReciepe.ingredientId];
                if (quantityInBank <= 0)
                    continue;
                
                uidToTransfert.push({uid: uid, elementReciepe: elementReciepe});
            }
        }
        return uidToTransfert;
    }

    // Transfert all
    async transfertAll(tc : TradingComponent, countByGid, uidToTransfert) {
        let sleepTime = 150, startRand = 0, endRand = 100;
        let totalK = 0;
        for (let i = 0; i <= uidToTransfert.length - 1; i++) {
            let item = uidToTransfert[i];
            let elementReciepe : ElementReciepe = item.elementReciepe;
            let quantityInBank = countByGid[elementReciepe.ingredientId];
            
            let quantityToTransfert = Math.min(quantityInBank, elementReciepe.totalQuantity) || 0;
            if (quantityToTransfert === 0) {
                tc.print(`transfertAll: Error: quantityToTransfert = 0 for ${elementReciepe.nameId}`);
                continue;
            }
            let randSleep = sleepTime + Math.floor(Math.random() * (endRand - startRand + 1) + startRand);
            let timeLeft = Math.round(randSleep * (uidToTransfert.length - i) / 1000);
            tc.print(`${elementReciepe.nameId} x ${quantityToTransfert} (${timeLeft}s).`);

            await tc.sleep(randSleep);
            this.removeItem(item.uid, quantityToTransfert, tc);
            totalK += elementReciepe.price * quantityToTransfert;
        }
        tc.onRowToggle();
        tc.print(`${uidToTransfert.length} items transfered (${totalK}k).`);
    }

    removeItem(uid: number, quantity: number, tradingComponent : TradingComponent): boolean {
            tradingComponent.game.window.dofus.sendMessage('ExchangeObjectMoveMessage', {
            objectUID: uid,
            quantity: quantity * -1
        });

        return true;
    }
  }
