import { ipcMain, app } from 'electron';

export class RuneMain {
    public static mainDir = app.getAppPath() + (process.platform === 'win32' ? '\\data\\2.divers\\rune\\' : '/data/2.divers/rune/');
    public static csvDir = RuneMain.mainDir + 'runes.csv';
    public static semiColumn = ';'
    public static comma = ',';
    public static lineSeparator = '\n';
    
    public static init() {
        const fs = require('fs');

        ipcMain.on('read-rune-csv', (event, args) => {
            fs.readFile(this.csvDir, 'utf8', function (err, data) {
                if (err) return console.log(err);
                event.sender.send('read-rune-csv-reply', data);
            });
        });
    }
}
