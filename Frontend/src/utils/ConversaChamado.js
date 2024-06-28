import { de } from "vuetify/locale";
import { StoreHubWebSocket } from "../stores/StoreHubWebSocket";
import { copiarParaObjeto } from "./WebSocketERWEBCliente/utils/Utils";
import { EmissorDeEvento } from "./WebSocketERWEBCliente/utils/EmissorDeEvento";

/**
 * @typedef MensagemChamado
 * @property {Number} sequencia - Sequencia da mensagem no chamado
 * @property {String} texto - Texto da mensagem
 * @property {'usuario' |'bot' | 'atendente'} tipoAutor - Tipo do autor da mensagem
 * @property {Object} usuario - Se tipo do autor for usuario, contém os detalhes do usuario
 * @property {Number} usuario.id - ID do usuario que enviou a mensagem
 * @property {String} usuario.nome - Nome do usuario que enviou a mensagem
 * @property {Object} bot - Se tipo do autor for bot, contém os detalhes do bot
 * @property {Object} atendente - Se tipo do autor for atendente, contém os detalhes do atendente
 * @property {Number} atendente.id - ID do atendente que enviou a mensagem
 * @property {String} atendente.nome - Nome do atendente que enviou a mensagem
 */

/**
 * Classe que representa uma conversa de um chamado.
 */
export class ConversaChamado {

    /**
     * ID unico do chamado
     */
    idChamado = undefined;

    /**
     * O sequencial unico do chamado.
     */
    sequenciaChamado = -1;

    /**
     * Titulo do chamado
     */
    titulo = ''

    /**
     * Descrição do chamado
     */
    descricao = ''

    /**
     * Mensagens contidas no chamado
     * @type {MensagemChamado[]}
     */
    mensagens = []

    /**
     * Se atualmente esse chamado está conectado na lista de interesses do servidor para receber notificações em tempo real
     */
    isInteressado = false;

    /**
     * Se o chamado está aberto 
     */
    isAberto = false;

    /**
     * Se o chamado encontra-se encerrado
     */
    isEncerrado = false;

    /**
     * Data em que o chamado foi aberto
     */
    dataAbertura = undefined;

    /**
     * Data em que o chamado foi encerrado
     */
    dataEncerrado = undefined;

    /**
     * Se o BOT já realizou a primeira interação com o chamado
     */
    isBotJaInteragiu = false;

    /**
     * Se o BOT atualmente está ativo no chamado
     */
    isBotAtivo = false;

    /**
     * Se atualmente existe um atendente ativo no chamado
     */
    isAtendenteAtivo = false;

    /**
     * Detalhes do usuario que realizou a abertura do chamado
     */
    solicitanteDoChamado = {
        id: '',
        nome: '',
        email: ''
    }

    listeners = {
        /**
         * Listener cadastrado ao Hub de WebSocketER para receber eventos de mensagens do chamado
         */
        escutaEventosChamado: undefined
    }

    /**
     * Emissor de eventos desse chamado em especifico
     * @type {EmissorDeEvento}
     */
    emissorEventos = new EmissorDeEvento('Emissor Chamado')

    estado = {
        /**
         * Se está sendo solicitado o inicio do chamado para o bot
         */
        isSolicitandoInicioDoChamadoBot: false,
        /**
         * Se está sendo solicitado a continuação do chamado para o bot responder
         */
        isSolicitandoContinuacaoDoChamadoBot: false,
        /**
         * Se atualmente o chamado está sendo sincroniado com o servidor
         */
        isSincronizandoComServidor: false,
        /**
         * Se atualmente está sendo solicitado um atendente humano para o chamado
         */
        isSolicitandoAtendenteHumano: false
    }

    /**
     * Instanciar a comunicação do bate papo em tempo real do chamado
     * @param {Number} idChamado - ID do chamado pra estabelecer a comunicação
     */
    constructor(idChamado) {
        this.idChamado = idChamado;

    }

    /**
     * Tentar estabelecer a comunicação de conversa do chamado.
     */
    async conectar() {
        const retornoConexao = {
            /**
             * Se a conexão foi estabelecida com sucesso
             */
            isConectado: false,
            /**
             * Se ocorreu algum erro na conexão, contém os detalhes dos erros
             */
            erro: {
                descricao: '',
                /**
                 * Se ocorreu um erro interno no servidor durante a solicitação de interesse
                 */
                isErroInterno: false,
                /**
                 * Se o servidor não aceitou a solicitação de interesse no chamado
                 */
                isServidorNaoAceitou: false,
                /**
                 * Detalhes do porque o servidor não aceitou a solicitação de interesse no chamado
                 */
                servidorNaoAceitou: {

                }
            }
        }

        this.isInteressado = false;

        this.log('Tentando solicitar interessado para o servidor...')
        const statusSolicitarInteresse = await StoreHubWebSocket().getConexaoHub().enviarComando('conectar-batepapo-chamado', {
            idDoChamado: this.idChamado
        })

        // O comando não foi processado com sucesso
        if (!statusSolicitarInteresse.sucesso) {
            retornoConexao.erro.descricao = statusSolicitarInteresse.erro.descricao;
            retornoConexao.erro.isErroInterno = statusSolicitarInteresse.erro.isErroInterno;
            this.log(`Erro ao solicitar interessado para o servidor, ele não conseguiu processar o comando de interesse pelo motivo: ${retornoConexao.erro.descricao}`)

            this.triggerVueReatividade();
            return retornoConexao;
        }

        // O servidor processou o comando! Analisar se ele aceitou a solicitação de interesse no chamado
        const payloadComando = statusSolicitarInteresse.retorno.payload;

        if (!payloadComando.isSucesso) {
            this.log(`O servidor não aceitou a solicitação de interessado no chamado. Motivo: ${payloadComando.erro.descricao}`)

            retornoConexao.erro.isServidorNaoAceitou = true;
            retornoConexao.erro.descricao = payloadComando.erro.descricao
            retornoConexao.erro.servidorNaoAceitou = {

            }

            this.triggerVueReatividade();
            return retornoConexao;
        }

        retornoConexao.isConectado = true;

        this.isInteressado = true;
        this.log('Interessado solicitado com sucesso')

        this.cadastrarListenerRecebeEventos();
        this.triggerVueReatividade();
        return retornoConexao;
    }

    /**
     * Dar trigger pro Vue recomputar esse cara
     */
    triggerVueReatividade() {

    }

    /**
     * Se for o inicio do chamado, solicitar o inicio da interação do bot no mesmo
     */
    async solicitarInicioDeInteracaoDoBot() {
        const retornoInicioInteracaoBot = {
            /**
             * Se o bot iniciou com sucesso a interação inicial do chamado
             */
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        // Se ainda está sendo solicitado o inicio da interação do bot
        if (this.estado.isSolicitandoInicioDoChamadoBot) {
            retornoInicioInteracaoBot.erro.descricao = 'Já está sendo solicitado o inicio da interação do bot no chamado';
            this.log(`O inicio da interação do bot já está sendo solicitado no chamado.`)
            this.triggerVueReatividade();
            return retornoInicioInteracaoBot;
        }

        this.estado.isSolicitandoInicioDoChamadoBot = true;

        this.log('Solicitando o inicio da interação do bot no chamado...')
        const statusComandoIniciar = await StoreHubWebSocket().getConexaoHub().enviarComando('interagir-estado-chamado', {
            idChamado: this.idChamado,
            tipo: 'iniciar_interacao_bot'
        });

        console.log(statusComandoIniciar);

        // Deu algum erro ao processar o comando
        if (!statusComandoIniciar.sucesso) {
            retornoInicioInteracaoBot.erro.descricao = `O servidor não conseguiu processar a solicitação de inicio de interação do bot. ${statusComandoIniciar.erro.descricao}`;
            this.log(`Erro ao solicitar inicio de interação do bot no chamado: ${retornoInicioInteracaoBot.erro.descricao}`)
            this.estado.isSolicitandoInicioDoChamadoBot = false;
            this.triggerVueReatividade();
            return retornoInicioInteracaoBot;
        }

        // O servidor processou o comando
        if (statusComandoIniciar.retorno.payload.isSucesso) {
            retornoInicioInteracaoBot.isSucesso = true;
            this.log('Inicio de interação do bot solicitado com sucesso!')

            this.isBotAtivo = true;
            this.isAtendenteAtivo = false;

            this.isBotJaInteragiu = true;
        } else {
            retornoInicioInteracaoBot.erro.descricao = `O servidor não aceitou a solicitação de inicio de interação do bot. ${statusComandoIniciar.retorno.payload.erro.descricao}`;
            this.log(`Erro ao solicitar inicio de interação do bot no chamado: ${retornoInicioInteracaoBot.erro.descricao}`)
        }

        this.estado.isSolicitandoInicioDoChamadoBot = false;

        this.triggerVueReatividade();
        return retornoInicioInteracaoBot;
    }

    /**
     * Se o chamado já foi iniciado, solicitar pro bot prosseguir com a interação baseado no contexto atual do chamado entre as mensagens do usuario e do bot 
     */
    async solicitarProsseguirInteracaoDoBot() {
        const retornoProsseguir = {
            /**
             * Se deu certo em prosseguir a conversa
             */
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        // Se o bot ainda não interagiu com o chamado
        if (!this.isBotJaInteragiu) {
            retornoProsseguir.erro.descricao = 'O bot ainda não interagiu com o chamado';
            this.log(`O bot ainda não interagiu com o chamado, não é possível prosseguir com a interação. Primeiro invoque o inicio da interação.`)
            this.triggerVueReatividade();
            return retornoProsseguir;
        }

        // Já foi solicitado a continuação, é necessario aguardar
        if (this.estado.isSolicitandoContinuacaoDoChamadoBot) {
            retornoProsseguir.erro.descricao = 'Já está sendo solicitado a continuação da interação do bot no chamado';
            this.log(`A continuação da interação do bot já está sendo solicitada no chamado.`)
            this.triggerVueReatividade();
            return retornoProsseguir;
        }

        this.estado.isSolicitandoContinuacaoDoChamadoBot = true;

        this.log('Solicitando a continualçao da interação do bot no chamado...')
        const statusComandoIniciar = await StoreHubWebSocket().getConexaoHub().enviarComando('interagir-estado-chamado', {
            idChamado: this.idChamado,
            tipo: 'prosseguir_interacao_bot'
        });

        console.log(statusComandoIniciar);

        // Deu algum erro ao processar o comando
        if (!statusComandoIniciar.sucesso) {
            retornoProsseguir.erro.descricao = `O servidor não conseguiu processar a solicitação de continuação de interação do bot. ${statusComandoIniciar.erro.descricao}`;
            this.log(`Erro ao solicitar continuação de interação do bot no chamado: ${retornoProsseguir.erro.descricao}`)
            this.estado.isSolicitandoContinuacaoDoChamadoBot = false;
            this.triggerVueReatividade();
            return retornoProsseguir;
        }

        // O servidor processou o comando
        if (statusComandoIniciar.retorno.payload.isSucesso) {
            retornoProsseguir.isSucesso = true;
            this.log('Continuação de interação do bot solicitado com sucesso!')

            this.isBotAtivo = true;
            this.isAtendenteAtivo = false;
        } else {
            retornoProsseguir.erro.descricao = `O servidor não aceitou a solicitação de inicio de interação do bot. ${statusComandoIniciar.retorno.payload.erro.descricao}`;
            this.log(`Erro ao solicitar inicio de interação do bot no chamado: ${retornoProsseguir.erro.descricao}`)
        }

        this.estado.isSolicitandoContinuacaoDoChamadoBot = false;
        this.triggerVueReatividade();
        return retornoProsseguir;
    }

    /**
     * Solicitar ao servidor para que o chamado esteja disponível para atendentes humanos conseguirem interagir com o usuario
     */
    async solicitarTransferirAtendente() {
        const retornoTransferir = {
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        if (this.estado.isSolicitandoAtendenteHumano) {
            retornoTransferir.erro.descricao = 'Já está sendo solicitado um atendente humano para o chamado';
            this.log(`Já está sendo solicitado um atendente humano para o chamado.`)
            this.triggerVueReatividade();
            return retornoTransferir;
        }

        if (this.isAtendenteAtivo) {
            retornoTransferir.erro.descricao = 'Já existe um atendente ativo no chamado';
            this.log(`Já existe um atendente ativo no chamado.`)
            this.triggerVueReatividade();
            return retornoTransferir;
        }

        this.estado.isSolicitandoAtendenteHumano = true;

        this.log('Solicitando um atendente humano para o chamado...')
        const statusSolicitaTransferir = await StoreHubWebSocket().getConexaoHub().enviarComando('interagir-estado-chamado', {
            idChamado: this.idChamado,
            tipo: 'transferir_atendente'
        });

        console.log(statusSolicitaTransferir);

        // O comando não foi executado com sucesso, provavelmente nem chegou ao servidor
        if (!statusSolicitaTransferir.sucesso) {
            retornoTransferir.erro.descricao = `O servidor não conseguiu processar a solicitação de transferir para um atendente humano. ${statusSolicitaTransferir.erro.descricao}`;
            this.log(`Erro ao solicitar transferir para um atendente humano: ${retornoTransferir.erro.descricao}`)
            this.estado.isSolicitandoAtendenteHumano = false;
            this.triggerVueReatividade();
            return retornoTransferir;
        }

        // Chegou ao servidor, porém ele não aceitou a solicitação
        if (!statusSolicitaTransferir.retorno.payload.isSucesso) {
            retornoTransferir.erro.descricao = `O servidor não aceitou a solicitação de transferir para um atendente humano. ${statusSolicitaTransferir.retorno.payload.erro.descricao}`;
            this.log(`Erro ao solicitar transferir para um atendente humano: ${retornoTransferir.erro.descricao}`)
            this.estado.isSolicitandoAtendenteHumano = false;
            this.triggerVueReatividade();
            return retornoTransferir;
        }

        // O servidor aceitou a solicitação
        this.log('Solicitação de transferir para um atendente humano realizada com sucesso!')

        retornoTransferir.isSucesso = true;
        this.estado.isSolicitandoAtendenteHumano = false;
        this.isAtendenteAtivo = true;
        this.isBotAtivo = false;
        this.triggerVueReatividade();
        return retornoTransferir;
    }

    /**
     * Solicitar o cancelamento do chamado ao servidor
     */
    async solicitarCancelamentoChamado() {
        const retornoCancelamento = {
            /**
             * Se a operação de cancelamento deu certo com sucesso.
             */
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        this.log('Solicitando cancelamento do chamado ao servidor...')

        const statusSolicitaCancelamento = await StoreHubWebSocket().getConexaoHub().enviarComando(`interagir-estado-chamado`, {
            idChamado: this.idChamado,
            tipo: 'encerrar_chamado'
        })

        // O servidor não retornou sucesso na requisição
        if (!statusSolicitaCancelamento.sucesso) {
            retornoCancelamento.erro.descricao = `O servidor não conseguiu processar a solicitação de cancelamento do chamado. ${statusSolicitaCancelamento.erro.descricao}`;
            this.log(`Erro ao solicitar cancelamento do chamado para o servidor: ${retornoCancelamento.erro.descricao}`)
            this.triggerVueReatividade();
            return retornoCancelamento;
        }

        if (statusSolicitaCancelamento.retorno.payload.isSucesso) {
            retornoCancelamento.isSucesso = true;
            this.log('Cancelamento do chamado solicitado com sucesso!')
        } else {
            retornoCancelamento.erro.descricao = `O servidor não aceitou a solicitação de cancelamento do chamado. ${statusSolicitaCancelamento.retorno.payload.erro.descricao}`;
            this.log(`Erro ao solicitar cancelamento do chamado para o servidor: ${retornoCancelamento.erro.descricao}`)
        }

        this.triggerVueReatividade();
        return retornoCancelamento;
    }

    /**
     * Adicionar um listener para quando estiver recebendo uma mensagem, será invocado o callback
     * @property {Function} callback - Callback para ser executar
     */
    onRecebendoStreamMensagem(callback) {
        const novoListenerId = this.emissorEventos.addEvento('onNovaStreamMensagem', callback);

        return {
            excluirListener: () => {
                novoListenerId.excluir();
            }
        }
    }

    /**
     * Adicionar um listener para quando o chamado for encerrado remotamente
     * @param {Function} callback 
     */
    onChamadoEncerrado(callback) {
        const novoListenerId = this.emissorEventos.addEvento('onChamadoEncerrado', callback);

        return {
            excluirListener: () => {
                novoListenerId.excluir();
            }
        }
    }

    /**
     * Cadastrar um listener no Hub para receber os eventos de mensagem do chamado
     */
    cadastrarListenerRecebeEventos() {
        this.log('Cadastrando listener para receber eventos de mensagens do chamado...')

        // Se já tiver cadastrado o listener, excluir o antigo
        if (this.listeners.escutaEventosChamado != undefined) {
            this.listeners.escutaEventosChamado.excluir();
        }

        const listenerHub = StoreHubWebSocket().onNovoEstadoChamado((detalhesComando) => {
            if (detalhesComando.payload.idChamado != this.idChamado) return

            this.#processarEventoChamado(detalhesComando.payload);
        })

        this.listeners.escutaEventosChamado = listenerHub;
    }

    /**
     * Enviar uma nova mensagem nesse chamado
     * @param {Object} detalhesMensagem - Detalhes da mensagem a ser enviada
     * @param {String} detalhesMensagem.texto - Texto da mensagem a ser enviada
     * @param {'usuario' | 'atendente'} detalhesMensagem.tipoAutor - Tipo do autor da mensagem para enviar
     */
    async enviarMensagem(detalhesMensagem) {
        let retornoMensagem = {
            /**
             * Se a mensagem foi registrada com sucesso no chamado
             */
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }
        this.log(`Enviando nova mensagem ${detalhesMensagem.tipoAutor}: ${detalhesMensagem.texto} para o servidor...`)

        const solicitaEnviarMensagem = await StoreHubWebSocket().getConexaoHub().enviarComando(`interagir-batepapo-chamado`, {
            idChamado: this.idChamado,
            mensagem: {
                tipoAutor: detalhesMensagem.tipoAutor,
                mensagem: detalhesMensagem.texto
            }
        })

        // O processamento do comando deu erro
        if (!solicitaEnviarMensagem.sucesso) {
            retornoMensagem.erro.descricao = `O servidor não conseguiu processar a solicitação de comando de enviar mensagem. ${solicitaEnviarMensagem.erro.descricao}`;
            this.log(`Erro ao enviar mensagem para o servidor: ${solicitaEnviarMensagem.erro.descricao}`)
            this.triggerVueReatividade();
            return retornoMensagem;
        }

        // O processamento deu certo e eu recebi o payload da resposta
        let retornoComando = solicitaEnviarMensagem.retorno.payload;
        if (!retornoComando.isSucesso) {
            retornoMensagem.erro.descricao = `A mensagem não pode ser aceita pelo servidor. Motivo: ${retornoComando.erro.descricao}`;
            this.log(`Erro ao enviar mensagem para o servidor: ${retornoComando.erro.descricao}`)
            this.triggerVueReatividade();
            return retornoMensagem;
        }

        this.log(`Mensagem enviada com sucesso para o servidor!`)

        // O servidor aprovou o envio da mensagem
        retornoMensagem.isSucesso = true;
        this.triggerVueReatividade();
        return retornoMensagem;
    }

    /**
     * Sincroniza esse chamado com o servidor para atualizar o estado atual do chamado
     */
    async sincronizarDoServidor() {
        const retornoSincronizar = {
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        if (this.estado.isSincronizandoComServidor) {
            retornoSincronizar.erro.descricao = 'Já está sendo sincronizado com o servidor';
            this.log(`O chamado já está sendo sincronizado com o servidor.`)
            this.triggerVueReatividade();
            return retornoSincronizar;
        }

        this.log('Sincronizando chamado com o servidor...')
        this.estado.isSincronizandoComServidor = true;

        const solicitaSincronizacaoChamado = await StoreHubWebSocket().getConexaoHub().enviarComando('interagir-estado-chamado', {
            idChamado: this.idChamado,
            tipo: 'obter_estado'
        })

        console.log(solicitaSincronizacaoChamado);

        if (!solicitaSincronizacaoChamado.sucesso) {
            retornoSincronizar.erro.descricao = `O servidor não conseguiu processar a solicitação de sincronização do chamado. ${solicitaSincronizacaoChamado.erro.descricao}`;
            this.log(`Erro ao sincronizar chamado com o servidor: ${retornoSincronizar.erro.descricao}`)
            this.estado.isSincronizandoComServidor = false;
            this.triggerVueReatividade();
            return retornoSincronizar;
        }

        if (!solicitaSincronizacaoChamado.retorno.payload.isSucesso) {
            retornoSincronizar.erro.descricao = `O servidor não aceitou a solicitação de sincronização do chamado. ${solicitaSincronizacaoChamado.retorno.payload.erro.descricao}`;
            this.log(`Erro ao sincronizar chamado com o servidor: ${retornoSincronizar.erro.descricao}`)
            this.estado.isSincronizandoComServidor = false;
            this.triggerVueReatividade();
            return retornoSincronizar;
        }

        // O servidor aprovou o comando e deve ter me retornado o estado do chamaod!
        const payloadEstado = solicitaSincronizacaoChamado.retorno.payload.sucesso.estado;

        this.titulo = payloadEstado.titulo;
        this.descricao = payloadEstado.descricao;

        this.mensagens = [];

        // Carregar as mensagens atuais
        for (const mensagemCarregada of payloadEstado.mensagens) {

            /**
             * @type {MensagemChamado}
             */
            const mensagemAppendar = {
                tipoAutor: mensagemCarregada.tipoAutor,
                texto: mensagemCarregada.mensagem,
                sequencia: mensagemCarregada.sequenciaMensagem,
                atendente: {
                    id: '',
                    nome: ''
                },
                usuario: {
                    id: '',
                    nome: ''
                }
            }

            if (mensagemCarregada.tipoAutor == 'usuario') {
                mensagemAppendar.usuario = {
                    id: mensagemCarregada.usuario.id,
                    nome: mensagemCarregada.usuario.nome
                }
            } else if (mensagemCarregada.tipoAutor == 'atendente') {
                mensagemAppendar.atendente = {
                    id: mensagemCarregada.atendente.id,
                    nome: mensagemCarregada.atendente.nome
                }
            }

            this.mensagens.push(mensagemAppendar);
        }

        this.isAberto = payloadEstado.estado.isAberto;
        this.isEncerrado = payloadEstado.estado.isEncerrado;
        this.dataAbertura = new Date(`${payloadEstado.estado.dataAbertura.split(' ')[0].split('/').reverse().join('/')} ${payloadEstado.estado.dataAbertura.split(' ')[1]}`);
        this.isBotAtivo = payloadEstado.estado.isBotAtivo;
        this.isAtendenteAtivo = payloadEstado.estado.isAtendenteAtivo;
        this.sequenciaChamado = payloadEstado.sequenciaNumerica

        if (payloadEstado.estado.dataEncerrado != undefined && payloadEstado.estado.dataEncerrado != '') {
            this.dataEncerrado = new Date(`${payloadEstado.estado.dataEncerrado.split(' ')[0].split('/').reverse().join('/')} ${payloadEstado.estado.dataEncerrado.split(' ')[1]}`)
        }

        this.isBotJaInteragiu = payloadEstado.estado.isBotJaIniciouInteracao;

        this.solicitanteDoChamado = {
            id: payloadEstado.usuarioSolicitante.id,
            nome: payloadEstado.usuarioSolicitante.nome,
            email: payloadEstado.usuarioSolicitante.email
        }

        this.estado.isSincronizandoComServidor = false;

        // Sincronizou com sucesso
        retornoSincronizar.isSucesso = true;
        console.log(this);
        this.triggerVueReatividade();
        return retornoSincronizar;
    }

    /**
     * Processar um evento de chamado recebido do servidor
     */
    async #processarEventoChamado(payload) {
        /**
         * @typedef PayloadNovoEventoChamado
         * @property {String} idChamado - ID do chamado que o evento ocorreu
         * @property {'mensagemChamado'} tipoDeEvento - Tipo de evento disparado para o chamado
         * @property {PayloadNovaMensagemChamado} mensagemChamado - Detalhes da mensagem que foi enviada se o evento for do tipo de nova mensagem no chamado
         */

        /**
         * @typedef PayloadNovaMensagemChamado
         * @property {Number} mensagemSequencia - Sequencia da mensagem no chamado
         * @property {'usuario' | 'bot' | 'atendente'} autor - Origem de quem enviou a mensagem no chamado. Usuario é a pessoa comun abrindo o chamado, bot seria uma resposta da IA e atendente seria uma resposta de um atendente humano interagindo no chat
         * @property {Object} usuario - Se o autor for um usuario, contém os detalhes do usuario
         * @property {Number} usuario.ID - ID do usuario
         * @property {String} usuario.nome - Nome do usuario
         * @property {Object} atendente - Se o autor for um atendente, contém os detalhes do atendente
         * @property {Number} atendente.ID - ID do atendente
         * @property {String} atendente.nome - Nome do atendente
         * @property {'atualizaMensagem' | 'appendMensagem'} tipoDeMensagem - Tipo da mensagem que está sendo notificada.
         * @property {Object} atualizaMensagem - Se o evento de mensagem for do tipo 'atualizaMensagem', contém o texto atualizado da mensagem
         * @property {String} atualizaMensagem.texto - Texto atualizado da mensagem
         * @property {Object} appendMensagem - Se o evento de mensagem for do tipo 'appendMensagem', contém o texto completo da mensagem e o texto que foi appendado
         * @property {String} appendMensagem.textoCompleto - Texto completo da mensagem
         * @property {String} appendMensagem.textoAppendado - Texto que foi appendado
         */

        this.log(`Processando novo evento recebido do servidor.`)

        /**
         * @type {PayloadNovoEventoChamado}
         */
        const payloadRecebido = {
            idChamado: -1,
            tipoDeEvento: '',
            mensagemChamado: {
                tipoDeMensagem: '',
                autor: '',
                mensagemSequencia: '',
                atendente: {
                    ID: '',
                    nome: ''
                },
                appendMensagem: {
                    textoAppendado: '',
                    textoCompleto: ''
                },
                atualizaMensagem: {
                    texto: ''
                },
                usuario: {
                    ID: '',
                    nome: ''
                }
            }
        }

        copiarParaObjeto(payloadRecebido, payload);

        console.log(payloadRecebido);

        switch (payloadRecebido.tipoDeEvento) {
            case 'mensagemChamado': {
                this.log(`Evento de mensagem do chamado recebido do servidor.`)

                let mensagemRecebida = this.mensagens.find(m => m.sequencia == payloadRecebido.mensagemChamado.mensagemSequencia);

                // Se a mensagem não existe no chamado, instanciar ela
                if (mensagemRecebida == undefined) {
                    /**
                     * A mensagem que foi recebida do servidor com seus detalhes
                     * @type {MensagemChamado}
                     */
                    mensagemRecebida = {
                        sequencia: payloadRecebido.mensagemChamado.mensagemSequencia,
                        texto: ''
                    }

                    if (payloadRecebido.mensagemChamado.autor == 'atendente') {
                        mensagemRecebida.tipoAutor = 'atendente';
                        mensagemRecebida.atendente = {
                            id: payloadRecebido.mensagemChamado.atendente.ID,
                            nome: payloadRecebido.mensagemChamado.atendente.nome
                        }
                    } else if (payloadRecebido.mensagemChamado.autor == 'usuario') {
                        mensagemRecebida.tipoAutor = 'usuario';
                        mensagemRecebida.usuario = {
                            id: payloadRecebido.mensagemChamado.usuario.ID,
                            nome: payloadRecebido.mensagemChamado.usuario.nome
                        }

                    } else if (payloadRecebido.mensagemChamado.autor == 'bot') {
                        mensagemRecebida.tipoAutor = 'bot';
                    }

                    this.mensagens.push(mensagemRecebida);
                }

                // Verificar o tipo da mensage menviada
                switch (payloadRecebido.mensagemChamado.tipoDeMensagem) {
                    case 'appendMensagem': {
                        mensagemRecebida.texto += payloadRecebido.mensagemChamado.appendMensagem.textoAppendado;
                        this.log(`Mensagem #${mensagemRecebida.sequencia} foi appendada com sucesso com o texto: ${payloadRecebido.mensagemChamado.appendMensagem.textoAppendado}`)
                        this.triggerVueReatividade();
                        this.emissorEventos.disparaEvento('onNovaStreamMensagem')
                        break;
                    }
                    case 'atualizaMensagem': {
                        mensagemRecebida.texto = payloadRecebido.mensagemChamado.atualizaMensagem.texto;
                        this.log(`Mensagem #${mensagemRecebida.sequencia} foi atualizada com sucesso com o texto: ${payloadRecebido.mensagemChamado.atualizaMensagem.texto}`)
                        this.triggerVueReatividade();
                        this.emissorEventos.disparaEvento('onNovaStreamMensagem')
                        break;
                    }
                    default: {
                        this.log(`Tipo de mensagem recebida do servidor não é reconhecida: ${payloadRecebido.mensagemChamado.tipoDeMensagem}`)
                        break;
                    }
                }
                break;
            }
            case 'chamadoEncerrado': {
                this.log(`Chamado foi detectado que foi encerrado. Atualizando informações do chamado`)
                await this.sincronizarDoServidor();
                this.emissorEventos.disparaEvento('onChamadoEncerrado')
            }
            default: {
                this.log(`Evento recebido do servidor não é reconhecido: ${payloadRecebido.tipoDeEvento}`)
                break;
            }
        }
    }

    log(msg) {
        let conteudoMsg = ''
        if (typeof msg == 'object') {
            conteudoMsg = JSON.stringify(msg, null, 4);
        } else {
            conteudoMsg = msg;
        }

        console.log(`[Chamado #${this.idChamado}] ${conteudoMsg}`)
    }
}