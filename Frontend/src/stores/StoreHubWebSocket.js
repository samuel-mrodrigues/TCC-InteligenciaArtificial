import { defineStore } from "pinia"
import { StoreBackend } from "./StoreBackend.js"
import { ClienteWebSocketER } from "../utils/WebSocketERWEBCliente/cliente/ClienteWebSocketER.js";
import { StoreDeSessao } from "./StoreSessao.js";
import { EmissorDeEvento } from "../utils/WebSocketERWEBCliente/utils/EmissorDeEvento.js";
import * as TipagemWebSocketERCliente from "../utils/WebSocketERWEBCliente/cliente/Tipagem.js"

/**
 * Cliente WebSocket conectado ao servidor
 * @type {ClienteWebSocketER}
 */
let webSocketER = undefined;

let emissorEventos = new EmissorDeEvento('StoreWebSocktetERCliente');

export const StoreHubWebSocket = defineStore('StoreHubWebSocket', {
    state: () => ({
        estado: {
            /**
             * iD do setInterval que verifica a conexão com o WebSocketER
             
             */
            setIntervalVerificaConexao: -1,
            /**
             * Se o WebSocket já conseguiu se conectar alguma vez
             */
            isJaConectouAlgumaVez: false,
            /**
             * O cliente HUB está conectado e autenticado com sucesso
             */
            isAutenticado: false,
            /**
             * Se atualmente está sendo feito a tentativa de reconexão
             */
            isEstabelecendoConexao: false
        }
    }),
    actions: {
        /**
        * Verificar se a conexão com o WebSocketER está ativa
        */
        verificarConexaoWebSocketER() {
            if (this.$state.estado.setIntervalVerificaConexao != -1) {
                clearInterval(this.$state.estado.setIntervalVerificaConexao)
            }

            this.$state.estado.setIntervalVerificaConexao = setInterval(async () => {
                if (webSocketER == undefined) {
                    return;
                }

                if (this.estado.isEstabelecendoConexao) return;

                this.estado.isEstabelecendoConexao = true;

                this.log(`Estado atual do WebSocket: ${webSocketER.getWebSocket().readyState}`)

                if (!this.estado.isAutenticado) {
                    this.log('Reconectando ao WebSocketER')
                    await this.conectarWebSocket();
                }

                this.estado.isEstabelecendoConexao = false;
            }, 5000)

        },
        /**
        * Iniciar a conexão com o WebSocketER
        */
        async conectarWebSocket() {
            if (webSocketER != undefined) {
                webSocketER.desconectar()
                this.estado.isAutenticado = false;
            }

            // Somente usuarios autenticados podem se conectar ao WebSocketER
            if (!StoreDeSessao().isAutenticado) {
                this.log(`Usuário não autenticado. Não é possível conectar ao WebSocketER`);
                return;
            }
            this.log(`Iniciando conexão com o WebSocketER`);

            const tokenDeAutorizacao = StoreDeSessao().estado.tokenAutenticacao;

            let urlDeConexao = `${StoreBackend().backend.ip}:${StoreBackend().backend.porta}/hubwebsocket/conectar`;
            if (webSocketER == undefined) {
                webSocketER = new ClienteWebSocketER(urlDeConexao, [{
                    nome: 'autorizacaouuid',
                    valor: tokenDeAutorizacao
                }])
            }

            const statusConexao = await webSocketER.conectar();
            if (statusConexao.sucesso) {

                webSocketER.getEmissorEventos().addEvento('desconectado', (codigo) => {
                    this.log(`Desconectado do WebSocketER. Código: ${codigo}`);
                    this.estado.isAutenticado = false;
                })

                if (this.$state.estado.isJaConectouAlgumaVez) {
                    emissorEventos.disparaEvento('websocket-reconectado');
                    this.log(`Reconexão com o WebSocketER estabelecida com sucesso`);
                } else {
                    this.$state.estado.isJaConectouAlgumaVez = true;
                    this.log(`Conexão com o WebSocketER estabelecida com sucesso pela primeira vez`);
                }

                this.log(`Autenticando com o WebSocketER após a conexão bem sucedida...`);

                // Enviar o comando de autenticar
                const statusAutenticar = await webSocketER.enviarComando('autenticar', {
                    idTokenAutenticacao: tokenDeAutorizacao
                })

                console.log(statusAutenticar);

                if (!statusAutenticar.sucesso) {
                    this.log(`Erro ao autenticar com o WebSocketER: ${statusAutenticar.erro.descricao}`);
                }

                if (!statusAutenticar.retorno.payload.isSucesso) {
                    this.log(`Erro ao autenticar com o WebSocketER: ${statusAutenticar.retorno.payload.erro.descricao}`);
                }

                this.log(`Autenticação com o WebSocketER realizada com sucesso`);
                this.estado.isAutenticado = true;
            } else {
                this.log(`Erro ao conectar com o WebSocketER`);
            }
        },
        /**
         * Retorna a conexão com o HUB
         */
        getConexaoHub() {
            return webSocketER;
        },
        /**
         * Retorna o emissor de eventos
         */
        getEmissorDeEventos() {
            return emissorEventos;
        },
        /**
         * Quando o servidor enviar uma nova notificação
         * @param {TipagemWebSocketERCliente.CallbackExecutarComando} callback - Função a ser executada quando o servidor enviar uma nova notificação do chamado
         */
        onNovoEstadoChamado(callback) {
            const listenerId = this.getEmissorDeEventos().addEvento('novo-estado-chamado', callback);

            // Se ainda o evento não foi cadastrado no WebSocketER
            if (webSocketER.getComandos().find(c => c.comando == 'novo-estado-chamado') == undefined) {
                webSocketER.cadastrarComando('novo-estado-chamado', (solicitacao, transmissao) => {

                    this.getEmissorDeEventos().disparaEvento('novo-estado-chamado', solicitacao, transmissao);
                    return 'OK';
                })
            }

            return {
                excluir:
                    /**
                     * Excluir o listener adicionado
                     */
                    () => {
                        listenerId.excluir();
                    }
            }
        },
        /**
         * Se desconectar do HUB WebSocketER
         */
        desconectar() {
            if (webSocketER != undefined) {
                webSocketER.desconectar();
                webSocketER = undefined;
            }
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