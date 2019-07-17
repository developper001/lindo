import { Component, Injector, OnInit } from '@angular/core';

import { Tab } from 'app/core/classes/tab';
import { ApplicationService } from 'app/core/electron/application.service';
import { IpcRendererService } from 'app/core/electron/ipcrenderer.service';
import { SettingsService } from 'app/core/service/settings.service';
import { TabGameService } from 'app/core/service/tab-game.service';
import { TabPluginService } from 'app/core/service/tab-plugin.service';
import { TabService } from 'app/core/service/tab.service';
import { PluginService } from 'app/core/service/plugin.service';
import { WindowService } from 'app/core/service/window.service';
import { OptionWindowService } from '../../window/option/option.window';

@Component({
    selector: 'component-tab-game',
    templateUrl: './tab-game.component.html',
    styleUrls: ['./tab-game.component.scss']
})
export class TabGameComponent implements OnInit {

    public windowService: WindowService;
    public appName: string;

    constructor(public option: OptionWindowService,
        public tabService: TabService,
        public pluginService: PluginService,
        public tabGameService: TabGameService,
        public tabPluginService: TabPluginService,
        private applicationService: ApplicationService,
        public settingsService: SettingsService,
        private ipcRendererService: IpcRendererService,
        private injector: Injector) {
            this.windowService = this.injector.get(WindowService)
            this.appName = applicationService.appName;
        }

    ngOnInit() {

        this.tabGameService.on('icon-change', (tab: Tab) => {
            this.windowService.window.document.getElementById(`tab-icon-${tab.id}`).innerHTML = '';
            this.windowService.window.document.getElementById(`tab-icon-${tab.id}`).style.display = 'none';
            if (tab.icon) {
                this.windowService.window.document.getElementById(`tab-icon-${tab.id}`).appendChild(tab.icon);
                this.windowService.window.document.getElementById(`tab-icon-${tab.id}`).style.display = 'block';
            }

        });

        if (!isElectron) {
            this.tabGameService.addTabGame();
            return;
        }

        //Ouverture du premier onglet
        if (this.settingsService.option.vip.multiaccount.active && Application.masterPassword != '')
            if (this.settingsService.option.vip.multiaccount.windows.length == 0) {
                this.tabGameService.addTabGame();
            } else {
                this.ipcRendererService.send('window-ready');
            }
        else {
            this.tabGameService.addTabGame();
        }
        
        // Ouverture des plugins
        this.tabPluginService.addPluginTab('Archi');
        this.tabPluginService.addPluginTab('Trading');
        this.tabPluginService.addPluginTab('Rune');

        // Onglet par défault
        // let runePlugin = this.pluginService.plugins.filter(plugin => plugin.isRune);
        // if (runePlugin && runePlugin[0] && runePlugin[0].id)
            // this.tabPluginService.selectTabPlugin(runePlugin[0].id);

        //Définition des événements
        this.ipcRendererService.on('new-tab', (event: Event) => {
            this.tabGameService.addTabGame();
        });

        this.ipcRendererService.on('close-tab', (event: Event) => {
            this.tabGameService.removeTabGame(this.tabService.active.id);
            // this.tabPluginService.removeTabPlugin(this.tabService.active.id);
        });

        this.ipcRendererService.on('previous-tab', (event: Event) => {

            let currentTab = this.tabService.active;
            let currentTabIndex = this.tabService.tabs.findIndex((element) => {
                return element.id == currentTab.id;
            });

            if (typeof (this.tabService.tabs[(currentTabIndex - 1)]) != 'undefined') {
                this.tabGameService.selectTabGame(this.tabService.tabs[(currentTabIndex - 1)].id);
            } else {
                if (typeof (this.tabService.tabs.slice(-1).pop()) != 'undefined') {
                    this.tabGameService.selectTabGame(this.tabService.tabs.slice(-1).pop().id);
                }
            }
        });

        this.ipcRendererService.on('next-tab', (event: Event) => {

            let currentTab = this.tabService.active;
            let currentTabIndex = this.tabService.tabs.findIndex((element) => {
                return element.id == currentTab.id;
            });

            if (typeof (this.tabService.tabs[(currentTabIndex + 1)]) != 'undefined') {
                this.tabGameService.selectTabGame(this.tabService.tabs[(currentTabIndex + 1)].id);
            } else {
                if (typeof (this.tabService.tabs[0]) != 'undefined') {
                    this.tabGameService.selectTabGame(this.tabService.tabs[0].id);
                }
            }
        });

        this.ipcRendererService.on('switch-tab', (event: Event, tabIndex: number) => {

            if (typeof (this.tabService.tabs[tabIndex]) != 'undefined') {
                this.tabGameService.selectTabGame(this.tabService.tabs[tabIndex].id);
            } else {
                let newIndex = tabIndex - this.tabService.tabs.length;
                if (typeof (this.pluginService.plugins[newIndex]) != 'undefined')
                    this.tabPluginService.selectTabPlugin(this.pluginService.plugins[newIndex].id);
            }
        });

    }
}
