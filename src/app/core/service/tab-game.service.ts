import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Game } from 'app/core/classes/game';
import { Tab } from 'app/core/classes/tab';
import { ApplicationService } from 'app/core/electron/application.service';
import { CryptService } from 'app/core/service/crypt.service';
import { GameService } from 'app/core/service/game.service';
import { PluginService } from 'app/core/service/plugin.service';
import { PromptService } from 'app/core/service/prompt.service';
import { TabService } from 'app/core/service/tab.service';
import * as async from 'async';
import { EventEmitter } from 'eventemitter3';

@Injectable()
export class TabGameService extends EventEmitter {

    private lastTabGameIndex: number = 1;

    constructor(
        private gameService: GameService,
        private pluginService: PluginService,
        private tabService: TabService,
        private promptService: PromptService,
        private translate: TranslateService,
        private applicationService: ApplicationService,
        private crypt: CryptService) {
        super();
    }

    /**
     * Ajoute un onglet de jeu
     * @param credentials
     * @param cb
     */
    public addTabGame(credentials: { account_name: string, password: string } = undefined, cb: any = undefined): void {

        let add = () => {

            let tab: Tab = new Tab(this.lastTabGameIndex++);

            this.tabService.addTab(tab);

            let game = new Game(tab.id, credentials);

            game.on('character', (name: string) => {
                tab.character = name;
            });

            game.on('icon', (icon: HTMLDivElement) => {
                tab.icon = icon;
                this.emit('icon-change', tab);
            });

            game.on('logged', (logged: boolean) => {
                tab.isLogged = logged;
            });
            game.on('notification', () => {
                if (this.tabService.active.id !== tab.id) {
                    tab.notification = true;
                }
            });

            this.gameService.addGame(game);

            this.selectTabGame(tab.id);

            if (cb) cb();

            // Actualiser les ingredient price automatiquement
        };

        if (this.gameService.games.length > 5) {

            this.promptService.confirm({
                title: this.translate.instant("app.prompt.title.confirm"),
                html: this.translate.instant("app.main.prompt.tabs-overflow.text"),
                type: "warning"
            }).then(() => {
                add();
            }, (dismiss) => {
            });
        } else {
            add();
        }
    }

    /**
     * Ajoute un onglet sans game.
     * @param credentials 
     * @param cb 
     */
    public addTabWithoutGame(credentials: { account_name: string, password: string } = undefined, cb: any = undefined): void {
        let add = () => {

            let tab: Tab = new Tab(this.lastTabGameIndex++);

            this.tabService.addTab(tab);

            if (cb) cb();

        };

        if (this.gameService.games.length > 5) {

            this.promptService.confirm({
                title: this.translate.instant("app.prompt.title.confirm"),
                html: this.translate.instant("app.main.prompt.tabs-overflow.text"),
                type: "warning"
            }).then(() => {
                add();
            }, (dismiss) => {
            });
        } else {
            add();
        }
    }

    /**
     * Sélectionne un onglet de jeu
     * @param id
     */
    public selectTabGame(id: number): void {
        // Cache le plugin actif
        if (this.pluginService.active !== null) {
            this.pluginService.active.isFocus = false;
            let plugin = this.pluginService.getPlugin(this.pluginService.active.id);
            if (plugin)
                plugin.isFocus = false;
        }

        // Cache le jeu et l'onglet actif
        if (this.tabService.active !== null) {
            this.tabService.active.isFocus = false;
            let game = this.gameService.getGame(this.tabService.active.id);
            if (game)
                game.isFocus = false;
        }

        let tab = this.tabService.getTab(id);
        let game = this.gameService.getGame(id);

        tab.isFocus = true;
        tab.notification = false;
        if (game) {
            game.isFocus = true;

            if (tab.isLogged) {
                game.window.focus();
            }
        }

        this.tabService.active = tab;
    }

    /**
     * Supprime un onglet de jeu
     * @param id: number
     */
    public removeTabGame(id: number): void {

        let tab: Tab = this.tabService.getTab(id);
        let game: Game = this.gameService.getGame(id);

        if (this.tabService.active !== null && this.tabService.active.id === id) {
            this.tabService.active = null;
        }

        //Recherche du prochain élement dans les tabs
        let currentTabIndex = this.tabService.tabs.findIndex((element) => {
            return element.id == tab.id;
        });

        //Suppression de l'onglet du jeu
        this.tabService.removeTab(tab);
        this.gameService.removeGame(game);

        //Sélection automatique du jeu suivant
        if (typeof (this.tabService.tabs[currentTabIndex]) != "undefined") {
            this.selectTabGame(this.tabService.tabs[currentTabIndex].id);
        } else {
            let lastGame = this.tabService.tabs.slice(-1).pop();
            if ((lastGame !== undefined)) {
                this.selectTabGame(lastGame.id);
            }
        }
    }

    // This function will create one tab for each account
    // @param accounts: Array of encrypted accounts to load
    addMultiAccountGames(accounts?: { account_name_encrypted: string, password_encrypted: string }[]) {

        if (!accounts || accounts.length == 0) {
            this.addTabGame();
            return;
        }

        // Ouverture d'un onglet pour chaque comptes
        async.eachSeries(accounts, (account, cb) => {

            let credentials = {
                account_name: this.crypt.decrypt(account.account_name_encrypted, Application.masterPassword),
                password: this.crypt.decrypt(account.password_encrypted, Application.masterPassword),
            };

            this.addTabGame(credentials, () => {
                setTimeout(cb, 1500);
            });

        }, () => {
            this.selectTabGame(this.lastTabGameIndex - 1);
        });

    }
}
