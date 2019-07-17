import { ipcMain, app } from 'electron';

export class ArchiMain {
    public static mainDir = app.getAppPath() + (process.platform === 'win32' ? '\\data\\2.divers\\archi\\' : '/data/2.divers/archi/');
    public static csvDir = ArchiMain.mainDir + 'archiList.csv';
    public static semiColumn = ';'
    public static comma = ',';
    public static lineSeparator = '\n';
    
    public static init() {
        const fs = require('fs');

        ipcMain.on('import-archi-csv', (event, args) => {
            fs.readFile(this.csvDir, 'utf8', function (err, data) {
                if (err) return console.log(err);
                event.sender.send('import-csv-archi-reply', data);
            });
        });
    }
}
