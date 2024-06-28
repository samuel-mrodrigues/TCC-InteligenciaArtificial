import { defineStore } from "pinia"
import { StoreHubWebSocket } from "./StoreHubWebSocket"

export const StoreGlobal = defineStore('StoreGlobal', {
    state() {
        return {
            paginaAtivaAtual: 'login',
            dev: {
                semDelayEmTudo: true
            }
        }
    },
    actions: {
        /**
         * Realizar o inicio dos stores importantes
         */
        startupStore() {

        },
        setarEstadoPraLogin() {
            this.paginaAtivaAtual = 'login'
        },
        setarEstadoProInicio() {
            this.paginaAtivaAtual = 'inicio'
        },
        log(msg) {
            let conteudoMsg = ''
            if (typeof msg == 'object') {
                conteudoMsg = JSON.stringify(msg, null, 4);
            } else {
                conteudoMsg = msg;
            }

            console.log(`[Store ${this.$id}] ${conteudoMsg}`)
        }
    }
})