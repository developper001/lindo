import { EventEmitter } from 'eventemitter3';

export class Plugin extends EventEmitter {

    public id: number;
    public isFocus: boolean = false;
    public window: any | Window = null;
    public pluginName : string = "New plugin";

    public isArchi: boolean = false;
    public isTrading: boolean = false;
    public isRune: boolean = false;
    
    public constructor(id: number, category: string) {

        super();
        this.id = id;

        this.pluginName = category;

        if (category === 'Archi')
            this.isArchi = true;
        else if (category === 'Trading')
            this.isTrading = true;
        else if (category === 'Rune')
            this.isRune = true;
    }
}
