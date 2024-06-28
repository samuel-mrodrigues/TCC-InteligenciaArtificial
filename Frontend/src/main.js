import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { createPinia } from "pinia";

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from "vuetify/iconsets/mdi"
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Imports do router
import { createRouter, createWebHashHistory } from "vue-router"
import RotaChamados from "./views/Chamados/Chamados.vue";
import RotaAtenderChamados from "./views/AtenderChamado/AtenderChamados.vue";
import RotaHistoricoChamados from "./views/HistoricoChamados/HistoricoChamados.vue"

const routerOpcoes = createRouter({
    history: createWebHashHistory(),
    routes: [{
        path: '/'
    }, {
        path: '/servicos/chamados',
        component: RotaChamados
    }, {
        path: '/servicos/chamados/atender',
        component: RotaAtenderChamados
    }, {
        path: '/servicos/chamados/historico',
        component: RotaHistoricoChamados
    }]
})
// -----------------------------------


const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi
        }
    }
});

const instanciaPinia = createPinia();
const instanciaAppVue = createApp(App);
instanciaAppVue.use(instanciaPinia).use(vuetify).use(routerOpcoes).mount("#app");