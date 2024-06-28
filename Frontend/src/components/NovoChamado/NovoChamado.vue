<script>
import { pausar } from "../../utils/utils.js";
import { StoreBackend } from "../../stores/StoreBackend.js";
import { ConversaChamado } from "../../utils/ConversaChamado";
import { proxyRefs, reactive } from "vue"

export default {
    props: {
        propAbrirModal: {
            type: Boolean
        },
        propChamadoidReabrir: {
            type: String
        }
    },
    emits: ["fechar", "reabrir-chamado-atual"],
    data() {
        return {
            status: {
                isModalAberto: false
            },
            formulario: {
                campos: {

                    /**
                     * Titulo da duvida do chamado
                     */
                    titulo: {
                        valor: undefined,
                        regras: []
                    },
                    /**
                     * Descrição com detalhes do chamado
                     */
                    descricao: {
                        valor: undefined,
                        regras: []
                    }
                }
            },
            estado: {
                widthJanelaAtual: 600,
                alerta: {
                    isMostrar: false,
                    cor: '',
                    texto: '',
                    icone: ''
                },
                /**
                 * O chamado está sendo aberto pelo usuario
                 */
                aberturaDoChamado: {
                    /**
                     * O chamado está na fase inicial e esta sendo editado
                     */
                    isAberturaDoChamado: true,
                    /**
                     * O chamado está sendo enviado ao servidor para ele criar o chamado
                     */
                    isSolicitandoAberturaNoServidor: false,
                    /**
                     * Se o chamado não pode mais ser editado
                     */
                    isBloquearEdicaoChamado: false,
                    /**
                     * Se o card deve ser exibido a animação de loading
                     */
                    isMostrarLoadingCard: false
                },
                /**
                 * O chamado não pode mais ser editado e a LLM será carregada para interagir com o usuario
                 */
                processandoChamado: {
                    isProcessandoChamado: false,
                    isMostrarCardLoading: false,
                    /**
                     * Se atualmente está sendo solicitado o cancelamento do chmado ao servidor
                     */
                    isSolicitandoCancelamentoChamado: false,
                    /**
                     * Se atualmente está sendo solicitado a transferencia do chamado para um humano ao servidor
                     */
                    isSolicitandoTransferirChamado: false,
                    mensagemEnviar: {
                        valor: undefined,
                        isEnviandoMensagemAtual: false,
                        isPermiteEnviarMensagem: false,
                        isExibirLoadingEnviarMensagem: false
                    },
                    /**
                     * Estado da janeal do bate-papo
                     */
                    janelaBatePapo: {
                        isExibirJanela: false,
                        /**
                         * Enquanto o BOT estiver respondendo
                         */
                        isBotRespondendo: false
                    },
                    /**
                     * ID do chamado que foi criado no servidor
                     */
                    idDoChamadoCriado: undefined,
                    /**
                     * Estado do chamado atual para comunicação
                     * @type {ConversaChamado}
                     */
                    chamado: undefined,
                    triggerChamadoReatividade: 1,
                    listeners: {
                        /**
                         * Listener cadastrado na classe do chamado que observa por stream de novas mensagens
                         */
                        escutaStreamDeMensagens: undefined,
                        /**
                         * Listener cadastrado na classe do chamado que observa por chamado encerrado
                         */
                        escutaChamadoEncerrado: undefined
                    }
                },
                /**
                 * Se o chamado atualmente se encontra cancelado
                 */
                isChamadoCancelado: false
            }
        }
    },
    methods: {
        /**
        * Evento para fechar o modal de configurar
        */
        clickFechar() {
            this.$emit("fechar")
        },
        onModalMinimizado() {
            console.log(`Modal de Chamado minimizado`);
            this.resetar();
        },
        onModalAberto() {
            console.log(`Modal de Chamado aberto`);

            // Se for um chamado para reexibir as informações
            if (this.isChamadoParaReexibir) {
                this.resumirChamadoExistente();
            }
        },
        /**
         * Resetar todo o estaco para um inicio de um novo chamado
         */
        resetar() {
            this.formulario.campos.titulo.valor = undefined;
            this.formulario.campos.descricao.valor = undefined;

            this.estado.aberturaDoChamado.isAberturaDoChamado = true;
            this.estado.aberturaDoChamado.isBloquearEdicaoChamado = false;
            this.estado.aberturaDoChamado.isMostrarLoadingCard = false;

            this.estado.processandoChamado.isProcessandoChamado = false;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
            this.estado.processandoChamado.mensagemEnviar.valor = undefined;
            this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual = false;
            this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = false;
            this.estado.processandoChamado.janelaBatePapo.isExibirJanela = false;
            this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = false;
            this.estado.processandoChamado.idDoChamadoCriado = undefined;

            this.removerEscutarPorStreamDeMensagensDoChamad();
            this.removerEscutarPorChamadoEncerrado();

            this.estado.processandoChamado.chamado = undefined;
            this.estado.processandoChamado.triggerChamadoReatividade = 1;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = false;
            this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = false;
            this.estado.isChamadoCancelado = false;
            this.estado.alerta.isMostrar = false;
            this.estado.alerta.cor = '';
            this.estado.alerta.icone = '';
            this.estado.alerta.texto = '';
        },
        async resumirChamadoExistente() {
            this.estado.aberturaDoChamado.isAberturaDoChamado = false;

            this.estado.alerta = {
                isMostrar: true,
                cor: 'primary',
                icone: 'mdi-reload',
                texto: 'Carregando informações do chamado, aguarde...'
            }

            console.log(`Se preparando para carregar informações de um chamado existente pelo id ${this.getIdChamadoReexibir}`);
            await pausar(1400)

            this.estado.processandoChamado.idDoChamadoCriado = this.getIdChamadoReexibir;

            const novoChamado = new ConversaChamado(this.getIdChamadoReexibir);
            novoChamado.triggerVueReatividade = () => {
                this.estado.processandoChamado.triggerChamadoReatividade++;
            }

            this.estado.processandoChamado.chamado = proxyRefs(novoChamado);

            const statusSolicitarSincronizacao = await novoChamado.sincronizarDoServidor();
            if (!statusSolicitarSincronizacao.isSucesso) {
                this.estado.alerta = {
                    isMostrar: true,
                    cor: 'error',
                    icone: 'mdi-alert',
                    texto: `Não foi possível carregar as informações do chamado. Motivo: ${statusSolicitarSincronizacao.erro.descricao}`
                }

                setTimeout(() => {
                    this.clickFechar();
                }, 4000);
                return;
            }

            this.formulario.campos.titulo.valor = this.estado.processandoChamado.chamado.titulo;
            this.formulario.campos.descricao.valor = this.estado.processandoChamado.chamado.descricao;

            this.estado.processandoChamado.isProcessandoChamado = false;
            this.estado.processandoChamado.janelaBatePapo.isExibirJanela = true;
            this.estado.widthJanelaAtual = 1000

            // Se o chamado já estiver encerrado, eu só deixo visualizar
            if (this.estado.processandoChamado.chamado.isEncerrado) {
                console.log(`O chamado atualmente se encontra encerrado`);

                this.estado.isChamadoCancelado = true;
                this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;
                this.estado.processandoChamado.isProcessandoChamado = false;
            } else {
                console.log(`Opa o chamado ainda tá aberto pra interação!`);

                console.log(`Conectando para receber mensagens em tempo real...`);

                this.estado.processandoChamado.isProcessandoChamado = true;
                const statusSolicitaConectar = await novoChamado.conectar();
                if (!statusSolicitaConectar.isConectado) {
                    this.estado.alerta = {
                        isMostrar: true,
                        cor: 'error',
                        icone: 'mdi-alert',
                        texto: `Não foi possível conectar ao servidor para receber mensagens em tempo real. Motivo: ${statusSolicitaConectar.erro.descricao}`
                    }

                    setTimeout(() => {
                        this.clickFechar();
                    }, 4000);
                    return;
                }

                console.log(`Se conectou com sucesso ao servidor!`);

                console.log(`Cadastrando interações em tempo real...`);
                // Carregar o listener para escutar por novas mensagens
                this.cadastrarEscutarPorStreamDeMensagensDoChamado();

                this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = true;
            }

            this.estado.alerta = {
                isMostrar: true,
                cor: 'success',
                icone: 'mdi-check-bold',
                texto: `Chamado carregado com sucesso!`
            }

            this.atualizarBarraDeRolagemChat();

            setTimeout(() => {
                this.estado.alerta.isMostrar = false;
            }, 3000);
        },
        /**
         * Cadastrar o listener no chamado para escutar por mensagens do servidor
         */
        cadastrarEscutarPorStreamDeMensagensDoChamado() {
            if (this.estado.processandoChamado.chamado != undefined) {
                if (this.estado.processandoChamado.listeners.escutaStreamDeMensagens != undefined) {
                    console.log(`Já existe um listener cadastrado para escutar por stream de mensagens no chamado. Removendo antigo..`);
                    this.estado.processandoChamado.listeners.escutaStreamDeMensagens.excluirListener()
                }

                this.estado.processandoChamado.listeners.escutaStreamDeMensagens = this.estado.processandoChamado.chamado.onRecebendoStreamMensagem(() => {
                    console.log(`Recebendo nova stream de mensagem no chamado, atualizando scrolling...`);
                    this.atualizarBarraDeRolagemChat();

                    if (this.estado.alerta.isMostrar) { }
                })
            }
        },
        /**
         * Remover o listener no chamado que escuta por stream de novas mensagens
         */
        removerEscutarPorStreamDeMensagensDoChamad() {
            if (this.estado.processandoChamado.listeners.escutaStreamDeMensagens != undefined) {
                console.log(`Removendo escuta de stream de mensagens do chamado`);
                this.estado.processandoChamado.listeners.escutaStreamDeMensagens.excluirListener()
            }
        },
        /**
         * Cadastrar o listener para escutar por chamados encerrados
         */
        cadastrarEscutarPorChamadoEncerrado() {
            if (this.estado.processandoChamado.chamado != undefined) {

                if (this.estado.processandoChamado.listeners.escutaChamadoEncerrado != undefined) {
                    console.log(`Já existe um listener cadastrado para escutar por chamado encerrado. Removendo antigo...`);
                    this.estado.processandoChamado.listeners.escutaChamadoEncerrado.excluirListener();
                }

                this.estado.processandoChamado.listeners.escutaChamadoEncerrado = this.estado.processandoChamado.chamado.onChamadoEncerrado(() => {
                    console.log(`O chamado foi encerrado, removendo listeners e bloqueando interações...`);

                    this.estado.alerta = {
                        cor: 'success',
                        icone: 'mdi-check-bold',
                        isMostrar: true,
                        texto: 'Seu chamado foi encerrado por outro usuario.'
                    }

                    this.estado.processandoChamado.isProcessandoChamado = false;
                    this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
                    this.estado.processandoChamado.janelaBatePapo.isExibirJanela = true;
                    this.estado.processandoChamado.isMostrarCardLoading = false;
                    this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;
                    this.estado.isChamadoCancelado = true;


                    this.removerEscutarPorStreamDeMensagensDoChamad();
                    this.removerEscutarPorChamadoEncerrado();
                })
            }
        },
        removerEscutarPorChamadoEncerrado() {
            if (this.estado.processandoChamado.listeners.escutaChamadoEncerrado != undefined) {
                console.log(`Já existe um listener cadastrado para escutar por chamado encerrado. Removendo antigo...`);
                this.estado.processandoChamado.listeners.escutaChamadoEncerrado.excluirListener();
            }
        },
        /**
         * Realizar o inicio do metodo de chamado. Onde será tentado a iniciativa do BOT tentar auxiliar o usuario
         */
        async abrirChamado() {

            console.log(`Ação para realizar a abertura do chamado iniciada!`);
            this.estado.alerta.isMostrar = true;
            this.estado.alerta.cor = 'primary';
            this.estado.alerta.icone = 'mdi-alert'
            this.estado.alerta.texto = `Realizando a abertura do seu chamado, um momento...`

            this.estado.aberturaDoChamado.isBloquearEdicaoChamado = true;
            this.estado.aberturaDoChamado.isMostrarLoadingCard = true;
            await pausar(2000);

            console.log(`Enviando solicitação de criação do chamado para o servidor...`);

            const solicitarCriacaoChamado = await StoreBackend().requisitar("POST", '/chamados', {
                titulo: this.formulario.campos.titulo.valor,
                descricao: this.formulario.campos.descricao.valor
            })

            this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = true;

            // Sem conexão com o servidor
            if (!solicitarCriacaoChamado.isSucesso) {
                this.estado.alerta.cor = 'error';
                this.estado.alerta.icone = 'mdi-alert'
                this.estado.alerta.texto = `Não foi possível abrir o chamado: ${solicitarCriacaoChamado.erro.descricao}`

                this.estado.aberturaDoChamado.isBloquearEdicaoChamado = false;
                this.estado.aberturaDoChamado.isMostrarLoadingCard = false;

                console.log(`Não foi possível alcançar o servidor para registrar o comando.`);
                return;
            }

            // Payload retornado do servidor
            let payloadRetorno = solicitarCriacaoChamado.sucesso.payload;
            if (!payloadRetorno.isSucesso) {

                // O servidor não autorizou a criação do chamado
                this.estado.alerta.cor = 'error';
                this.estado.alerta.icone = 'mdi-alert'
                this.estado.alerta.texto = `Não foi possível abrir o chamado: ${payloadRetorno.erro.descricao}`

                this.estado.aberturaDoChamado.isBloquearEdicaoChamado = false;
                this.estado.aberturaDoChamado.isMostrarLoadingCard = false;

                console.log(`O servidor não aprovou a solicitação de criar o chamado. Retorno foi: ${payloadRetorno.erro.descricao}`);
                return;
            }

            const idDoChamadoCriado = payloadRetorno.sucesso.payloadSucesso.idChamado;

            console.log(`O chamado foi criado com sucesso no servidor. O ID retornado foi ${idDoChamadoCriado}`);
            this.estado.processandoChamado.idDoChamadoCriado = idDoChamadoCriado;

            // Se o servidor confirmou a criação do chamado, prosseguir para abrir a janela de interação do assistente
            this.estado.aberturaDoChamado.isMostrarLoadingCard = false;
            this.estado.aberturaDoChamado.isAberturaDoChamado = false;

            this.estado.alerta.icone = 'mdi-check-bold'
            this.estado.alerta.cor = 'success'
            this.estado.alerta.texto = `O chamado foi iniciado com sucesso. Aguarde um momento...`

            this.estado.processandoChamado.isMostrarCardLoading = true;
            this.estado.processandoChamado.isProcessandoChamado = true;

            await pausar(2000);

            this.prosseguirProcessamentoChamado();
        },
        /**
         * Realiza a continuação do chamado aberto com o assistente
         */
        async prosseguirProcessamentoChamado() {
            console.log(`Prosseguindo com o processamento do chamado agora que ele foi aberto.`);

            this.estado.alerta.cor = 'warning'
            this.estado.alerta.icone = 'mdi-robot'
            this.estado.alerta.texto = `Preparando a interação do chamado, aguarde...`

            await pausar(2000);

            // Instanciar a classe de chamado que se conecta ao servidor e estabelece toda a comunicação
            const novoChamado = new ConversaChamado(this.estado.processandoChamado.idDoChamadoCriado);
            novoChamado.triggerVueReatividade = () => {
                this.estado.processandoChamado.triggerChamadoReatividade++;
            }

            console.log(`Tentando conectar o chamado atual com o servidor para comunicação`);
            const statusSolicitarInteresse = await novoChamado.conectar();
            if (!statusSolicitarInteresse.isConectado) {
                console.log(`Não foi possível conectar o chamado com o servidor. Motivo: ${statusSolicitarInteresse.erro.descricao}`);

                this.estado.alerta.cor = 'error'
                this.estado.alerta.icone = 'mdi-alert'
                this.estado.alerta.texto = `Não foi possível conectar o chamado com o servidor. Motivo: ${statusSolicitarInteresse.erro.descricao}`
            }

            // O chamado foi conectado com sucesso
            this.estado.processandoChamado.chamado = reactive(novoChamado);
            this.estado.processandoChamado.isMostrarCardLoading = false;

            this.estado.alerta.cor = 'success'
            this.estado.alerta.icone = 'mdi-check-bold'
            this.estado.alerta.texto = `Interação com o chamado iniciado.`
            this.estado.widthJanelaAtual = 1000

            let timeoutMostrar = setTimeout(() => {
                this.estado.alerta.isMostrar = false;
            }, 3000);

            this.estado.processandoChamado.janelaBatePapo.isExibirJanela = true;
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = true;

            this.cadastrarEscutarPorStreamDeMensagensDoChamado();
            this.cadastrarEscutarPorChamadoEncerrado();

            novoChamado.isBotAtivo = true;
            novoChamado.triggerVueReatividade();

            console.log(`Solicitando o inicio do chamado com o assistente...`);
            let statusSolicitaInicio = await novoChamado.solicitarInicioDeInteracaoDoBot();

            if (!statusSolicitaInicio.isSucesso) {
                clearTimeout(timeoutMostrar);
                console.log(`Não foi possível iniciar a interação com o assistente. Motivo: ${statusSolicitaInicio.erro.descricao}`);
                this.estado.alerta.cor = 'error'
                this.estado.alerta.icone = 'mdi-alert'
                this.estado.alerta.texto = `Não foi possível iniciar a interação com o assistente. Motivo: ${statusSolicitaInicio.erro.descricao}`
                this.estado.alerta.isMostrar = true;
                return;
            }

            console.log(`O assistente finalizou a interação inicial. Liberando pro usuario digitar...`);
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = false;
            this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = true;
            this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual = false;
            this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = false;

            setInterval(() => {
                this.estado.processandoChamado.teste++;
            }, 500);
        },
        /**
         * Enviar mensagem digitada na caixa de bate papo
         */
        async clickEnviarMensagem() {

            if (!this.isPodeEnviarMensagemChat) {
                console.log(`Não é possível enviar a mensagem no momento`);
                return;
            }

            this.estado.alerta.isMostrar = false;

            this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual = true;
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = true;
            this.estado.processandoChamado.isMostrarCardLoading = true;

            console.log(`Enviando mensagem para o chat...`);

            const statusEnviarMensagem = await this.estado.processandoChamado.chamado.enviarMensagem({
                tipoAutor: 'usuario',
                texto: this.estado.processandoChamado.mensagemEnviar.valor
            })

            if (statusEnviarMensagem.isSucesso) {
                console.log(`Mensagem enviada com sucesso!`);

                this.estado.processandoChamado.mensagemEnviar.valor = undefined;

                // Se o bot estiver ativo no chamado, solicitar a continuação da interação para ele
                if (this.isBotAtivo) {
                    console.log(`Solicitiando ao bot a continuação da interação...`);
                    this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = true;
                    const solicitaContinuacaoInteracaoBot = await this.estado.processandoChamado.chamado.solicitarProsseguirInteracaoDoBot();
                    if (solicitaContinuacaoInteracaoBot.isSucesso) {
                        console.log(`O bot respondeu a mensagem com sucesso!`);
                    } else {
                        // console.log(`Não foi possível solicitar a continuação da interação com o bot. Motivo: ${solicitaContinuacaoInteracaoBot.erro.descricao}`);

                        // this.estado.alerta.cor = 'error'
                        // this.estado.alerta.icone = 'mdi-alert'
                        // this.estado.alerta.texto = `Não foi possível gerar uma resposta do assistente para o seu chamado. Motivo: ${solicitaContinuacaoInteracaoBot.erro.descricao}`
                        // this.estado.alerta.isMostrar = true;
                        this.estado.processandoChamado.chamado.sincronizarDoServidor();
                    }
                    this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = false;
                } else {
                    console.log(`O bot não está ativo no chamado, não é necessário solicitar a continuação da interação.`);
                }
            } else {
                console.log(`Não foi possível enviar a mensagem. Motivo: ${statusEnviarMensagem.erro.descricao}`);

                this.estado.alerta.cor = 'error'
                this.estado.alerta.icone = 'mdi-alert'
                this.estado.alerta.texto = `Não foi possível enviar a mensagem. Motivo: ${statusEnviarMensagem.erro.descricao}`
                this.estado.alerta.isMostrar = true;
                this.estado.processandoChamado.chamado.sincronizarDoServidor();
            }
            this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual = false;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem = false;
            this.estado.processandoChamado.janelaBatePapo.isBotRespondendo = false;
            this.atualizarBarraDeRolagemChat()
        },
        /**
         * Solicitar o encerramento do chamado atual
         */
        async solicitarEncerrarChamado() {

            if (this.estado.processandoChamado.isSolicitandoCancelamentoChamado) return;

            this.estado.processandoChamado.isSolicitandoCancelamentoChamado = true;
            console.log(`Solicitando o cancelamento do chamado`);

            this.estado.alerta = {
                cor: 'warning',
                icone: 'mdi-alert',
                isMostrar: true,
                texto: 'Solicitando o cancelamento do chamado, aguarde...'
            }

            this.estado.processandoChamado.isMostrarCardLoading = true;
            this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;

            const statusSolicitaCancelar = await this.estado.processandoChamado.chamado.solicitarCancelamentoChamado();

            if (statusSolicitaCancelar.isSucesso) {
                console.log(`O chamado foi cancelado com sucesso!`);

                this.estado.alerta = {
                    cor: 'success',
                    icone: 'mdi-check-bold',
                    isMostrar: true,
                    texto: 'O chamado foi encerrado com sucesso!'
                }

                this.estado.processandoChamado.isProcessandoChamado = false;
                this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
                this.estado.processandoChamado.janelaBatePapo.isExibirJanela = true;
                this.estado.processandoChamado.isMostrarCardLoading = false;
                this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;
                this.estado.isChamadoCancelado = true;

                this.removerEscutarPorStreamDeMensagensDoChamad();
                this.removerEscutarPorChamadoEncerrado();
            } else {
                console.log(`Não foi possível cancelar o chamado. Motivo: ${statusSolicitaCancelar.erro.descricao}`);

                this.estado.alerta = {
                    cor: 'error',
                    icone: 'mdi-alert',
                    isMostrar: true,
                    texto: `Não foi possível cancelar o chamado. Motivo: ${statusSolicitaCancelar.erro.descricao}`
                }

                this.estado.processandoChamado.isSolicitandoCancelamentoChamado = false;
                this.estado.processandoChamado.isMostrarCardLoading = false;
                this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = true;
            }
        },
        /**
         * Solicitar para transferir o chamado para um humano
         */
        async solicitarTransferirHumano() {
            if (this.estado.processandoChamado.isSolicitandoTransferirChamado) return;

            this.estado.processandoChamado.isSolicitandoTransferirChamado = true;
            this.estado.processandoChamado.isMostrarCardLoading = true;
            this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;

            console.log(`Solicitando ao servidor para transferir o chamado para um humano>..`);

            this.estado.alerta = {
                cor: 'warning',
                icone: 'mdi-alert',
                isMostrar: true,
                texto: 'Solicitando transferência do chamado para um humano, aguarde...'
            }

            await pausar(2000);

            const statusTransferirHumano = await this.estado.processandoChamado.chamado.solicitarTransferirAtendente();
            if (statusTransferirHumano.isSucesso) {
                console.log(`O chamado foi transferido com sucesso para um humano!`);

                this.estado.alerta = {
                    cor: 'success',
                    icone: 'mdi-check-bold',
                    isMostrar: true,
                    texto: 'O chamado foi transferido com sucesso para um humano. A partir de agora, o assistente não irá mais interagir no chamado.!'
                }

                this.estado.processandoChamado.isSolicitandoTransferirChamado = false;
                this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = false;

                setTimeout(() => {
                    this.estado.alerta.isMostrar = false;
                }, 5000);
            } else {
                console.log(`Não foi possível transferir o chamado para um humano. Motivo: ${statusTransferirHumano.erro.descricao}`);

                this.estado.alerta = {
                    cor: 'error',
                    icone: 'mdi-alert',
                    isMostrar: true,
                    texto: `Não foi possível transferir o chamado para um humano. Motivo: ${statusTransferirHumano.erro.descricao}`
                }

            }



            this.estado.processandoChamado.isSolicitandoTransferirChamado = false;
            this.estado.processandoChamado.isMostrarCardLoading = false;
            this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem = true;
        },
        /**
         * Dividir a mensagem atual em linhas para exibição(se houver pulos de linha)
         * @returns {String[]}
         */
        formatarMensagemLinha(texto) {
            return texto.texto.split('\n');
        },
        atualizarBarraDeRolagemChat() {
            const elementoChat = this.$refs.historicochat;
            if (elementoChat != undefined) {
                console.log(`Scrollando chat atual pro maximo possível...`);

                elementoChat.$el.scrollTop = elementoChat.$el.scrollHeight;
            }
        }
    },
    computed: {
        getDadosDoChamado() {
            return {
                titulo: this.formulario.campos.titulo.valor,
                descricao: this.formulario.campos.descricao.valor
            }
        },
        /**
         * Se o chamado atual já foi criado e deve ser exibido somente a janela para visualizar
         */
        isChamadoParaReexibir() {
            return this.propChamadoidReabrir != undefined
        },
        /**
         * Se for um chamado atual que já existe e é apenas para reexibir as informações
         */
        getIdChamadoReexibir() {
            return this.propChamadoidReabrir
        },
        isBotAtivo() {
            return this.estado.processandoChamado.triggerChamadoReatividade >= 1 && this.estado.processandoChamado.chamado.isBotAtivo;
        },
        /**
         * Se o usuario pode enviar mensagens pro chat
         */
        isPodeEnviarMensagemChat() {

            if (this.isBloquearInteracoesDoChamado) {
                return false;
            }

            if (this.estado.processandoChamado.mensagemEnviar.valor == undefined) {
                return false;
            }

            if (this.estado.processandoChamado.mensagemEnviar.valor.length <= 3) {
                return false;
            }

            return true;
        },
        isBloquearInteracoesDoChamado() {
            if (this.estado.processandoChamado.janelaBatePapo.isBotRespondendo) {
                return true;
            }

            if (this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual) {
                return true;
            }

            if (!this.estado.processandoChamado.mensagemEnviar.isPermiteEnviarMensagem) {
                return true;
            }

            if (this.estado.processandoChamado.isSolicitandoCancelamentoChamado) {
                return true;
            }

            if (this.estado.processandoChamado.isSolicitandoTransferirChamado) {
                return true;
            }

            return false;
        },
        getMensagemEnvioAtual() {
            if (this.isPodeEnviarMensagemChat) {
                return 'Enviar mensagem atual';
            } else {
                if (this.estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual) {
                    return 'Aguarde sua mensagem anterior ser enviada...';
                } else if (this.estado.processandoChamado.janelaBatePapo.isBotRespondendo) {
                    return 'Aguarde o assistente terminar de responder...';
                } else if (this.estado.processandoChamado.isSolicitandoCancelamentoChamado) {
                    return 'Aguarde o cancelamento do chamado...';
                } else {
                    if (this.estado.processandoChamado.mensagemEnviar.valor == undefined) {
                        return 'Digite alguma coisa para enviar primeiro...';
                    } else {
                        if (this.estado.processandoChamado.mensagemEnviar.valor.length <= 3) {
                            return 'Digite mais de 3 caracteres para enviar...'
                        }
                    }
                }
            }
        },
        /**
         * Retorna o historico de mensagens do chamado atual
         */
        getMensagensChamado() {
            /**
             * @typedef Mensagem
             * @property {'bot' | 'usuario' | 'atendente'} autor - Autor da mensagem
             * @property {String} nomeAutor - Nome do autor da mensagem
             * @property {String} texto - Texto da mensagem
             * @property {Number} sequencia - Sequencia da mensagem de forma crescente
             */

            /**
             * @type {Mensagem[]}
             */
            let mensagensHistorico = []
            if (this.estado.processandoChamado.triggerChamadoReatividade >= 0 && this.estado.processandoChamado.chamado != undefined) {
                for (const mensagemNoChamado of this.estado.processandoChamado.chamado.mensagens) {

                    /**
                     * @type {Mensagem}
                     */
                    let novaMensagem = {
                        texto: mensagemNoChamado.texto,
                        sequencia: mensagemNoChamado.sequencia,
                    }

                    if (mensagemNoChamado.tipoAutor == 'bot') {
                        novaMensagem.autor = 'bot';
                        novaMensagem.nomeAutor = 'Assistente';
                    } else if (mensagemNoChamado.tipoAutor == 'usuario') {
                        novaMensagem.autor = 'usuario';
                        novaMensagem.nomeAutor = mensagemNoChamado.usuario.nome
                    } else if (mensagemNoChamado.tipoAutor == 'atendente') {
                        novaMensagem.autor = 'atendente';
                        novaMensagem.nomeAutor = mensagemNoChamado.atendente.nome
                    }

                    mensagensHistorico.push(novaMensagem);
                }
            }

            mensagensHistorico.sort((a, b) => {
                return a.sequencia - b.sequencia;
            })

            return mensagensHistorico;
        }
    },
    watch: {
        propAbrirModal(novoValor) {
            this.status.isModalAberto = novoValor;

            if (novoValor) {
                this.onModalAberto();
            } else {
                this.onModalMinimizado();
            }
        }
    }
}
</script>

<template>
    <v-dialog v-model="status.isModalAberto" :max-width="`${estado.widthJanelaAtual}px`" persistent>

        <v-alert v-model="estado.alerta.isMostrar" :color="estado.alerta.cor" :icon="estado.alerta.icone"
            :text="estado.alerta.texto"></v-alert>

        <!-- Modelo de Abertura de chamado -->
        <v-expand-transition>
            <v-card v-if="estado.aberturaDoChamado.isAberturaDoChamado"
                :disabled="estado.aberturaDoChamado.isBloquearEdicaoChamado"
                :loading="estado.aberturaDoChamado.isMostrarLoadingCard">
                <v-form>
                    <v-card-title>Novo Chamado</v-card-title>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-text-field v-model="formulario.campos.titulo.valor" :rules="formulario.campos.titulo.regras"
                            label="Titulo" prepend-icon="mdi-chat-question" required></v-text-field>
                        <v-textarea v-model="formulario.campos.descricao.valor" label="Descrição" prepend-icon="mdi-message"
                            required></v-textarea>
                    </v-card-text>
                </v-form>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="success" variant="tonal" @click="abrirChamado()">Abrir chamado</v-btn>
                    <v-divider></v-divider>
                    <v-btn prepend-icon="mdi-close" color="red" @click="clickFechar()">Fechar</v-btn>
                </v-card-actions>
            </v-card>
        </v-expand-transition>

        <v-expand-transition>
            <div v-if="estado.processandoChamado.isProcessandoChamado">

                <v-card prepend-icon="mdi-message" :title="`Chamado em Andamento: ${getDadosDoChamado.titulo}`">
                    <v-card-text>
                        <div class="text-medium-emphasis mb-1">
                            {{ getDadosDoChamado.descricao }}</div>
                        <v-divider></v-divider>
                    </v-card-text>

                    <v-card-actions>
                        <v-divider></v-divider>
                        <v-btn prepend-icon="mdi-close" color="red" @click="clickFechar()">Fechar</v-btn>
                    </v-card-actions>
                </v-card>

                <v-divider></v-divider>
            </div>
        </v-expand-transition>

        <v-expand-transition>
            <v-card prepend-icon="mdi-close" title="O chamado está encerrado" v-if="estado.isChamadoCancelado">
                <v-form>
                    <v-divider></v-divider>
                    <v-card-text>
                        <p class="text-h5 text-center font-weight-bold">Titulo: {{ formulario.campos.titulo.valor }}</p>
                        <v-divider></v-divider>
                        <p class="text-h6 text-center font-weight-bold">Detalhes: {{ formulario.campos.descricao.valor }}
                        </p>
                    </v-card-text>

                    <v-card-actions>
                        <v-divider></v-divider>
                        <v-btn prepend-icon="mdi-close" color="red" @click="clickFechar()">Fechar</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card>
        </v-expand-transition>

        <v-expand-transition>
            <v-card :loading="estado.processandoChamado.isMostrarCardLoading"
                v-if="estado.processandoChamado.janelaBatePapo.isExibirJanela" prepend-icon="mdi-chat-processing"
                :title="`${estado.isChamadoCancelado ? 'Hístorico de Conversa' : `${isBotAtivo ? `Bate-papo com o Assistente` : `Bate-Papo com um Atendente Humano`}`}`">
                <v-divider></v-divider>

                <!-- Bate papo -->
                <v-container ref="historicochat" id="historicochat" class="bg-grey-darken-2"
                    style="max-height: 600px; overflow-y: scroll;">
                    <p class="text-center font-weight-bold">Chat</p>
                    <v-divider :thickness="2" color="white" opacity="50%"></v-divider>

                    <v-row class="pa-0 ma-0" v-for="historicoMensagem, index in getMensagensChamado">

                        <!-- Mensagem do bot -->
                        <template v-if="historicoMensagem.autor == 'bot'">
                            <v-col cols="2">
                                <div class="bg-grey-darken-2">
                                    <p class="text-center">
                                        <v-btn icon="mdi-robot" variant="text"></v-btn>
                                    </p>
                                    <p class="text-center font-weight-bold">Assistente</p>
                                </div>
                            </v-col>

                            <v-col class=" pa-1 ma-0 rounded" cols="10">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p>{{ tokenDeTexto }}</p>
                                </div>
                            </v-col>
                        </template>

                        <!-- Mensagem do atendente -->
                        <template v-if="historicoMensagem.autor == 'atendente'">
                            <v-col class="bg-grey-darken-1" cols="2">
                                <div
                                    v-if="getMensagensChamado[index - 1] != undefined && getMensagensChamado[index - 1].autor != 'atendente'">
                                    <p class="text-center">
                                        <v-btn icon="mdi-shield-account" variant="text"></v-btn>
                                    </p>
                                    <p class="text-center font-weight-bold">{{ historicoMensagem.nomeAutor }}</p>
                                    <p class="text-center">(Atendente)</p>
                                </div>
                            </v-col>

                            <v-col class="pa-1 ma-0 rounded bg-grey-darken-1" cols="10">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p>{{ tokenDeTexto }}</p>
                                </div>
                            </v-col>
                        </template>

                        <!-- Mensagem do usuario -->
                        <template v-else-if="historicoMensagem.autor == 'usuario'">
                            <v-col cols="10">
                                <p class="text-right">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p style="display: inline-block;" class="bg-grey-darken-3 rounded-xl pa-2">{{
                                        tokenDeTexto }}</p>
                                </div>
                                </p>
                            </v-col>

                            <v-col cols="2">
                                <div v-if="getMensagensChamado[index - 1] != undefined && getMensagensChamado[index - 1].autor != 'usuario'"
                                    class="bg-grey-darken-3 rounded-lg">
                                    <p class="text-center">
                                        <v-btn icon="mdi-account" variant="text"></v-btn>
                                    </p>
                                    <p class="text-center font-weight-bold">{{ historicoMensagem.nomeAutor }}</p>
                                    <p class="text-center">(Você)</p>
                                </div>
                            </v-col>
                        </template>

                    </v-row>
                </v-container>

                <div v-if="!estado.isChamadoCancelado" class="bg-grey-darken-2">
                    <!-- Texto para enviar mensagem -->
                    <v-text-field label="Converse aqui"
                        :disabled="estado.processandoChamado.mensagemEnviar.isEnviandoMensagemAtual"
                        v-model="estado.processandoChamado.mensagemEnviar.valor" density="compact"
                        @keyup.enter="clickEnviarMensagem()">
                        <template v-slot:prepend>
                            <v-btn class="bg-white"
                                :loading="estado.processandoChamado.mensagemEnviar.isExibirLoadingEnviarMensagem"
                                @click="clickEnviarMensagem()" :disabled="!isPodeEnviarMensagemChat" icon="mdi-send"
                                style="outline: none;" color="success" variant="text"></v-btn>
                            <v-tooltip activator="parent" :text="getMensagemEnvioAtual">

                            </v-tooltip>
                        </template>

                    </v-text-field>

                    <v-divider></v-divider>
                    <div class="d-flex justify-space-around">
                        <v-btn color="success" @click="solicitarEncerrarChamado()"
                            :loading="estado.processandoChamado.isSolicitandoCancelamentoChamado"
                            :disabled="isBloquearInteracoesDoChamado">Encerrar Chamado

                            <v-tooltip activator="parent"
                                text="Fechar o chamado atual. Nenhum atendente irá responder ao seu chamado.">

                            </v-tooltip>
                        </v-btn>
                        <v-btn v-if="isBotAtivo" color="warning" text="warning" :disabled="isBloquearInteracoesDoChamado"
                            @click="solicitarTransferirHumano()"
                            :loading="estado.processandoChamado.isSolicitandoTransferirChamado">Solicitar
                            Atendente

                            <v-tooltip activator="parent" text="Solicitar um atendente humano para resolver o problema">
                            </v-tooltip>
                        </v-btn>
                    </div>
                </div>

            </v-card>
        </v-expand-transition>
    </v-dialog>
</template>

<style scoped>
.historicochat ::-webkit-scrollbar {
    /*Your styles here*/
    background-color: rgb(var(--v-theme-white));
    width: 7px;
}

.historicochat ::-webkit-scrollbar-track {
    /*Your styles here*/
    /* background-color: rgb(var(--v-theme-success)) */
}

.historicochat ::-webkit-scrollbar-thumb {
    /*Your styles here*/
    background-color: rgb(var(--v-theme-primary))
}
</style>