import * as Tipagem from './Tipagem.js'
import * as TipagemCliente from "../comunicacao/Tipagem.js";


import { ClienteWS } from "../comunicacao/Cliente.js";
import { EmissorDeEvento } from "../utils/EmissorDeEvento.js";

export class ClienteWebSocketER extends ClienteWS {

    /**
     * Conexão com o servidor WebSocket
     * @type {WebSocket}
     */
    #conexaoWebSocket;

    /**
     * Parametros de configuração
     */
    #parametros = {
        host: '',
    }

    /**
     * Estado atual da cliente
     */
    #estado = {
        /**
         * Se a conexão com o servidor está estabelecida
         */
        isConectado: false
    }

    /**
     * Comandos disponiveis no cliente
     * @type {TipagemCliente.Comando[]}
     */
    #comandos = []

    /**
     * Emissor de eventos do Cliente
     */
    #emissorEventos = new EmissorDeEvento('Cliente');

    /**
     * Headers opcionais que são enviados junto na requisição
     * @type {{nome: String, valor: String}[]}
     */
    #headers = []


    /**
     * Iniciar a conexão com um servidor WebSocketER
     * @param {String} host - Endereço do servidor
     * @param {{nome: String, valor: String}[]} headers - Headers opcionais para enviar na conexão com o servidor WebSocketER
     */
    constructor(host, headers) {
        super();

        this.#parametros.host = host;

        if (headers != undefined && Array.isArray(headers)) {
            this.#headers = headers;
        }

        // Quando o servidor quiser enviar uma mensagem para o cliente
        this.getEmissorEventos().addEvento('enviar-mensagem', (webSocketMensagem) => {
            this.processaEnviarMensagemServidor(webSocketMensagem);
        })

        this.getComandos = () => {
            return this.#comandos;
        }

        this.executorDeComando = async (solicitacao, transmissao) => {
            return await this.#processarExecucaoComando(solicitacao, transmissao);
        }
    }

    /**
     * Conectar ao servidor WebSocketER
     * @return {Promise<Tipagem.PromiseConectarWebSocketER>}
     */
    async conectar() {
        /**
         * @type {Tipagem.PromiseConectarWebSocketER}
         */
        const retornoConectar = {
            sucesso: false,
        }
        const novaConexao = new WebSocket(`ws://${this.#parametros.host}`)
        novaConexao.onmessage = (mensagemBuffer) => {
            this.processaMensagemWebSocket(mensagemBuffer);
        }

        this.#conexaoWebSocket = novaConexao;
        return new Promise(resolve => {

            novaConexao.onclose = (codigo, close) => {
                console.log(`Desconectado do servidor WebSocketER.`);
                this.#estado.isConectado = false;
                this.getEmissorEventos().disparaEvento('desconectado', codigo)
                resolve(retornoConectar);
            };

            novaConexao.onerror = (erro) => {
                console.log(`Ocorreu um erro no WebSocket`);
            }

            novaConexao.onopen = () => {
                console.log('Conectado ao servidor WebSocketER');
                this.#estado.isConectado = true;
                retornoConectar.sucesso = true;
                resolve(retornoConectar);
            };
        })
    }

    /**
     * Verificar o WebSocket está conectado corretamente
     */
    estaConectado() {
        this.#conexaoWebSocket.readyState === WebSocket.OPEN;
    }

    /**
     * Desconectar do servidor WebSocketER
     */
    desconectar() {
        this.#conexaoWebSocket.close();
    }

    /**
     * Adicionar um novo comando para ser executado
     * @param {String} comando - Nome do comando
     * @param {Tipagem.CallbackExecutarComando} callback - Função a ser executada quando o comando for solicitado
     */
    cadastrarComando(comando, callback) {
        /**
         * @type {TipagemCliente.Comando}
         */
        const novoComando = {
            comando: comando,
            callback: callback
        }

        this.#comandos.push(novoComando);
    }

    /**
     * Realiza a ação de enviar mensagem ao cliente conectado no servidor
     * @param {TipagemCliente.WebSocketMensagem} webSocketMensagem
     */
    processaEnviarMensagemServidor(webSocketMensagem) {
        this.#conexaoWebSocket.send(JSON.stringify(webSocketMensagem));
    }

    /**
     * Retorna a instancia WebSocket do JavaScript
     */
    getWebSocket() {
        return this.#conexaoWebSocket;
    }

    /**
     * Processar uma execução de um comando
     * @param {TipagemCliente.SolicitaComando} solicitacao
     * @param {TipagemCliente.TransmissaoWebSocket} transmissao
     */
    async #processarExecucaoComando(solicitacao, transmissao) {
        const comandoSolicitado = this.#comandos.find(comando => comando.comando === solicitacao.comando);

        if (comandoSolicitado != undefined) {
            return await comandoSolicitado.callback(solicitacao, transmissao);
        } else {
            return;
        }
    }
}