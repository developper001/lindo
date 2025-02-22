import { ShortcutsSpellComponent } from './window/shortcuts/spell/spell.component';
import { ShortcutsOtherComponent } from './window/shortcuts/other/other.component';
import { ShortcutsInventoryComponent } from './window/shortcuts/inventory/inventory.component';
import { ShortcutsInterfaceComponent } from './window/shortcuts/interface/interface.component';
import { ShortcutsApplicationComponent } from './window/shortcuts/application/application.component';
import { Http, HttpModule } from "@angular/http";
import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { TagInputModule } from 'ngx-chips';
import { CoreModule } from "app/core/modules/core.module";
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localeIt from '@angular/common/locales/it';


import { AppRoutingModule } from './app.routing';

import { AppComponent } from "app/app.component";
import { MainComponent } from "app/main/main.component";
import { GameComponent } from "app/components/game/game.component";
import { ChangeLogComponent } from "app/window/changelog/changelog.component";
import { OptionComponent } from "app/window/option/option.component";
import { GeneralComponent } from "app/window/option/general/general.component";
import { TabGameComponent } from "app/main/tab-game/tab-game.component";
import { ToolbarComponent } from "app/main/toolbar/toolbar.component";
import { VipComponent } from "app/window/option/vip/vip.component";
import { GeneralComponent as VipGeneralComponent } from "app/window/option/vip/general/general.component";
import { AutoGroupComponent } from "app/window/option/vip/auto-group/auto-group.component";
import { MultiAccountComponent } from "app/window/option/vip/multi-account/multi-account.component";
import { NotificationComponent } from "app/window/option/notification/notification.component";
import { AuthComponent } from "app/components/auth/auth.component";
import { AboutComponent } from "app/window/option/about/about.component";
import { TradingComponent } from "app/components/game/plugins/trading/trading.component";
import { ReciepeComponent } from "app/components/game/plugins/trading/reciepe/reciepe.component";
import { ArchiComponent } from "app/components/game/plugins/archi/archi.component";
import { RuneComponent } from "app/components/game/plugins/rune/rune.component";

import { SortablejsModule } from "angular-sortablejs/dist";
import { MaterialModule } from "app/core/modules/material.module";
import { MatTableModule, MatSortModule } from '@angular/material';

import { ShortcutsComponent } from "app/window/shortcuts/shortcuts.component";
import { InputComponent } from 'app/window/shortcuts/input/input.component';

import { ServiceModule } from "app/core/modules/service.module";
import { registerLocaleData, CommonModule } from "@angular/common";
import { GameUpdateComponent } from "app/window/game-update/game-update.component";
import { OfficialGameUpdateComponent } from "app/window/official-game-update/official-game-update.component";
import { HttpClient, HttpClientModule } from '@angular/common/http';

export function translateModuleFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, '../../locale/', '.json')
}

registerLocaleData(localeFr);
registerLocaleData(localeEn);
registerLocaleData(localeEs);
registerLocaleData(localeIt);

@NgModule({
    imports: [
        CommonModule,
        CoreModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (translateModuleFactory),
                deps: [HttpClient]
            }
        }),
        SortablejsModule,
        FormsModule,
        MatTableModule,
        MatSortModule,
        TagInputModule,
        HttpClientModule,
        MaterialModule,
        ServiceModule
    ],
    declarations: [
        AppComponent,
        MainComponent,
        AuthComponent,
        TabGameComponent,
        ToolbarComponent,
        GameComponent,
        AboutComponent,
        ChangeLogComponent,
        OptionComponent,
        GeneralComponent,
        NotificationComponent,
        VipComponent,
        AutoGroupComponent,
        VipGeneralComponent,
        MultiAccountComponent,
        GameUpdateComponent,
        OfficialGameUpdateComponent,
        TradingComponent,
        ReciepeComponent,
        ArchiComponent,
        RuneComponent,

        ShortcutsComponent,
        ShortcutsApplicationComponent,
        ShortcutsInterfaceComponent,
        ShortcutsInventoryComponent,
        ShortcutsOtherComponent,
        ShortcutsSpellComponent,
        InputComponent
    ],
    entryComponents: [
        ChangeLogComponent,
        OptionComponent,
        ShortcutsComponent
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
