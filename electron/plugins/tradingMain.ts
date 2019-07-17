import { Logger } from '../core/logger/logger-electron';
import { ipcMain, app } from 'electron';

export class TradingMain {
    public static basepath = app.getAppPath() + (process.platform === 'win32' ? '\\data' : '/data/');
    public static ventesDir = TradingMain.basepath + (process.platform === 'win32' ? '1.ventes\\ventes.txt' : '1.ventes/ventes.txt');
    public static invenduDir = TradingMain.basepath + (process.platform === 'win32' ? '1.ventes\\invendu.txt' : '1.ventes/invendu.txt');
    public static csvDir = TradingMain.basepath + (process.platform === 'win32' ? '2.divers\\trading\\reciepesBot.csv' : '2.divers/trading/reciepesBot.csv');
    public static semiColumn = ';'
    public static comma = ',';
    public static lineSeparator = '\n';
    
    public static init() {
        const fs = require('fs');

        ipcMain.on('update-sell-history', (event, arg) => {
            setTimeout(function (theseArgs) {
                let fs = require('fs');
                fs.readFile(TradingMain.ventesDir, 'utf8', function (err, ventesData) {
                    if (err) return console.log(err);
                    Logger.info('update-sell-history: reading ventes.txt');

                    fs.readFile(TradingMain.invenduDir, 'utf8', function (err, unsold) {
                        if (err) return console.log(err);
                        Logger.info('update-sell-history: reading invendu.txt');
                        let res = {ventesData: ventesData, unsold: unsold};
                        event.sender.send('update-sell-history-reply', res);
                    });
                });
            }, 500);
        });

        ipcMain.on('export-csv', (event, args) => {
            try {
                let res = '';
                let data = args[0];
                let keys = args[1];
                if (data.length <= 0 || keys.length <= 0)
                    return;
                data = data.sort((a, b) => b.margin - a.margin);
                res += keys.join(this.semiColumn) + this.lineSeparator;
                let regex = new RegExp(this.semiColumn, 'g');
                for(let i = 0; i <= data.length - 1; i++) {
                    for (let j = 0; j <= keys.length - 1; j++) {
                        let key = keys[j];
                        let valueToWrite = data[i][key];
                        if (valueToWrite === undefined)
                            valueToWrite = '';
                        let dataToAdd = (valueToWrite + '').replace(regex, this.comma);
                        res += dataToAdd + ((j === keys.length - 1) ? '' : this.semiColumn);
                    }
                    res += this.lineSeparator;
                }
                fs.writeFile(this.csvDir, res, function(err) {
                    if(err) return console.log(err);
                });
                Logger.info('export-csv: reading reciepesBot.csv');
                event.sender.send('export-csv-reply', this.csvDir);
            } catch (e) {
                console.warn(e);
            }
        });

        ipcMain.on('import-csv', (event, args) => {
            fs.readFile(this.csvDir, 'utf8', function (err, data) {
                if (err) return console.log(err);
                event.sender.send('import-csv-reply', data);
            });
        });
    }
}
