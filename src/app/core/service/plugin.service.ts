import { Plugin } from 'app/core/classes/plugin';

export class PluginService {

    private _plugins:Plugin[] = [];
    public active: Plugin = null;

    get plugins(){
        return this._plugins;
    }

    getPlugin(id: number): Plugin {
        
        return this._plugins.filter((plugin:Plugin) => {
            return plugin.id === id;
        })[0];
    }

    addPlugin(plugin: Plugin): void {
        this._plugins.push(plugin);
    }

    removePlugin(plugin: Plugin): void {
        
        let index = this._plugins.indexOf(plugin);

        if(index !== -1){
            this._plugins.splice(index, 1);
        }
    }

}
