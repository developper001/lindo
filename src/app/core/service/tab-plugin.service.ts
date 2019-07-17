import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Plugin } from 'app/core/classes/plugin';
import { ApplicationService } from 'app/core/electron/application.service';
import { CryptService } from 'app/core/service/crypt.service';
import { PluginService } from 'app/core/service/plugin.service';
import { GameService } from 'app/core/service/game.service';
import { TabService } from 'app/core/service/tab.service';
import { PromptService } from 'app/core/service/prompt.service';
import { EventEmitter } from 'eventemitter3';

@Injectable()
export class TabPluginService extends EventEmitter {

    private lastTabPluginIndex: number = 1;

    constructor(
        private pluginService: PluginService,
        private gameService: GameService,
        private tabService: TabService,
        private promptService: PromptService,
        private translate: TranslateService,
        private applicationService: ApplicationService,
        private crypt: CryptService) {
        super();
    }

    /**
     * Ajoute un onglet de plugin.
     * @param credentials 
     * @param cb 
     */
    public addPluginTab(category, cb: any = undefined): void {
        let plugin = new Plugin(this.lastTabPluginIndex++, category);

        this.pluginService.addPlugin(plugin);

        if (cb) cb();
    }

    /**
     * Sélectionne un plugin
     * @param id
     */
    public selectTabPlugin(id: number): void {

        // hide game tab
        if (this.tabService.active !== null) {
            this.tabService.active.isFocus = false;
            let game = this.gameService.getGame(this.tabService.active.id);
            if (game)
                game.isFocus = false;
        }

        // switch plugin
        if (this.pluginService.active !== null) {
            this.pluginService.active.isFocus = false;
            let plugin = this.pluginService.getPlugin(this.pluginService.active.id);
            if (plugin)
                plugin.isFocus = false;
        }

        let plugin = this.pluginService.getPlugin(id);

        if (plugin) {
            plugin.isFocus = true;
        }

        this.pluginService.active = plugin;
    }

    /**
     * Supprime un onglet de plugin
     * @param id: number
     */
    public removeTabPlugin(id: number): void {

        let plugin: Plugin = this.pluginService.getPlugin(id);

        if (this.pluginService.active !== null && this.pluginService.active.id === id) {
            this.pluginService.active = null;
        }

        //Recherche du prochain élement dans les plugins
        let currentTabIndex = this.pluginService.plugins.findIndex((element) => {
            return element.id == plugin.id;
        });

        //Suppression de l'onglet plugin
        this.pluginService.removePlugin(plugin);

        //Sélection automatique du plugin suivant
        if (typeof (this.pluginService.plugins[currentTabIndex]) != "undefined") {
            this.selectTabPlugin(this.pluginService.plugins[currentTabIndex].id);
        } else {
            let lastPlugin = this.pluginService.plugins.slice(-1).pop();
            if ((lastPlugin !== undefined)) {
                this.selectTabPlugin(lastPlugin.id);
            }
        }
    }
}
