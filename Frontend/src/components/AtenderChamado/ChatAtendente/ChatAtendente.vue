<script>
import { StoreBackend } from '../../../stores/StoreBackend';
import { ConversaChamado } from '../../../utils/ConversaChamado';
import { pausar } from '../../../utils/utils';
import { reactive } from "vue"

export default {
    props: {
        propChamadoId: {
            type: String
        },
        propisModalAberto: {
            type: Boolean
        }
    },
    data: () => ({
        dialog: {
            isDialogAberto: false
        },
        alerta: {
            isMostrar: false,
            cor: '',
            texto: '',
            icone: ''
        },
        estado: {
            /**
             * Se atualmente as informações do chamado estão sendo carregados
             */
            isCarregandoInformacoesChamado: false,
            /**
             * Se as informações do chamado foram carregados
             */
            isChamadoCarregado: false,
            /**
             * Se atualmente está sendo enviado uma mensagem ao chamado
             */
            isEnviandoMensagemAoServidor: false,
            /**
             * Trigger de reatividade pra atualizar os valores computados
             */
            triggerChamadoReatividade: 1,
            /**
             * Informações da janela de chamado
             */
            janelaChamado: {
                /**
                 * Classe Chamado para manipulação do chamado
                 * @type {ConversaChamado}
                 */
                chamado: undefined,
                /**
                 * Se a janela de bate papo está sendo exibida
                 */
                isExibirBatePapo: false,
                /**
                 * Se deve definir o chat como "pensando"
                 */
                isExibirChatPensando: false,
                /**
                 * Se o chamado estiver encerrado o usuario não conseguirá interagir com ele
                 */
                isChamadoEncerrado: false,
                /**
                 * Informações da mensagem que o atendente pode digitar pra enviar
                 */
                mensagemEnviar: {
                    texto: '',
                    /**
                     * Controla de forma absoluta se o usuario vai conseguir enviar uma mensagem
                     */
                    isPodeEnviarMensagem: false
                },
                /**
                 * Alguns listeners para observar o comportamento do chamado
                 */
                listeners: {
                    onStreamDeMensagem: undefined,
                    onChamadoEncerrado: undefined
                }
            }
        },
    }),
    emits: ["fechar", 'chamado-fechado'],
    methods: {
        /**
         * Resetar o chamado atual apra o estado padrão
         */
        resetar() {
            this.estado.isCarregandoInformacoesChamado = false;
            this.estado.isEnviandoMensagemAoServidor = false;

            this.estado.triggerChamadoReatividade = 1

            this.estado.janelaChamado.chamado = undefined;
            this.estado.janelaChamado.isChamadoEncerrado = false;
            this.estado.isChamadoCarregado = false;
            this.estado.janelaChamado.isExibirBatePapo = false;
            this.estado.janelaChamado.isExibirChatPensando = false;
            this.estado.janelaChamado.mensagemEnviar.texto = '';
            this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem = false;

            this.removerEscutarPorChamadoEncerrado();
            this.removerEscutarPorStreamDeMensagensDoChamad();
        },
        /**
         * 
         * @param {Object} propriedadesAlerta 
         * @param {String} propriedadesAlerta.cor
         * @param {String} propriedadesAlerta.texto
         * @param {String} propriedadesAlerta.icone
         * @param {Boolean} propriedadesAlerta.isMostrar
         */
        setAlerta(propriedadesAlerta) {
            if (propriedadesAlerta.cor != undefined) this.alerta.cor = propriedadesAlerta.cor;
            if (propriedadesAlerta.texto != undefined) this.alerta.texto = propriedadesAlerta.texto;
            if (propriedadesAlerta.icone != undefined) this.alerta.icone = propriedadesAlerta.icone;
            if (propriedadesAlerta.isMostrar != undefined) this.alerta.isMostrar = propriedadesAlerta.isMostrar;
        },
        onModalAberto() {
            console.log(`Modal do chat de atendente foi aberto`);

            this.carregarInformacoesChamado();
        },
        onModalMinimizado() {
            console.log(`Modal do chat de atendente foi minimizado`);

            setTimeout(() => {
                this.resetar();
            }, 500);
        },
        /**
        * Evento para fechar o modal de configurar
        */
        clickFechar() {
            this.$emit("fechar")
        },
        atualizarBarraDeRolagemChat() {
            const elementoChat = this.$refs.historicochat;
            if (elementoChat != undefined) {
                console.log(`Scrollando chat atual pro maximo possível...`);

                elementoChat.$el.scrollTop = elementoChat.$el.scrollHeight;
            }
        },
        /**
         * Carrega as informações do chamado pelo seu ID
         */
        async carregarInformacoesChamado() {
            console.log(`Tentando carregar informações do chamado`);
            this.estado.isCarregandoInformacoesChamado = true;
            this.estado.janelaChamado.isExibirChatPensando = true;

            this.setAlerta({
                cor: 'info',
                texto: 'Carregando informações do chamado, aguarde...',
                icone: 'mdi-information',
                isMostrar: true
            })

            // Se for pra recarregar o chamado aberto atual
            let chamadoConversa;
            if (this.estado.janelaChamado.chamado == undefined) {
                console.log(`Criando nova instancia de chamado para manipulação...`);
                chamadoConversa = new ConversaChamado(this.getChamadoID);
                chamadoConversa.triggerVueReatividade = () => {
                    this.estado.triggerChamadoReatividade++;
                }

                this.estado.janelaChamado.chamado = reactive(chamadoConversa);
                chamadoConversa.triggerVueReatividade();
                await pausar(1200);
            } else {
                chamadoConversa = this.estado.janelaChamado.chamado;
            }

            // Solicitar ao servidor todas as informações do chamado
            const statusSincronizaChamado = await chamadoConversa.sincronizarDoServidor();

            // Deu algum erro na solicitação do comando ao servidor
            if (!statusSincronizaChamado.isSucesso) {
                console.log(`Erro ao carregar informações do chamado: ${statusSincronizaChamado.erro.descricao}`);
                this.estado.isCarregandoInformacoesChamado = false;
                this.estado.janelaChamado.isExibirChatPensando = false;

                this.setAlerta({
                    cor: 'error',
                    texto: `Erro ao carregar informações do chamado: ${statusSincronizaChamado.erro.descricao}`,
                    icone: 'mdi-alert',
                    isMostrar: true
                })
                return;
            }

            this.cadastrarEscutarPorStreamDeMensagensDoChamado();
            this.cadastrarEscutarPorChamadoEncerrado();

            console.log(`Solicitando comunicação de conexão online com o chamado...`);
            const solicitaComunicacao = await chamadoConversa.conectar();
            if (!solicitaComunicacao.isConectado) {
                this.estado.isCarregandoInformacoesChamado = false;
                this.estado.janelaChamado.isExibirChatPensando = false;

                this.setAlerta({
                    cor: 'error',
                    texto: `Erro ao estabelecer comunicação online com o chamado: ${solicitaComunicacao.erro.descricao}`,
                    icone: 'mdi-alert',
                    isMostrar: true
                })
                return;
            }

            // Se chegou até aqui, então as informações do chamado foram carregadas com sucesso
            console.log(`Informações do chamado foram carregados com sucesso`);

            this.setAlerta({
                cor: 'success',
                texto: 'Informações do chamado carregadas com sucesso',
                icone: 'mdi-check',
                isMostrar: true
            })

            this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem = true;
            this.estado.janelaChamado.isExibirChatPensando = false;
            this.estado.isCarregandoInformacoesChamado = false;
            this.estado.janelaChamado.isExibirBatePapo = true;
            this.estado.isChamadoCarregado = true;

            setTimeout(() => {
                this.setAlerta({ isMostrar: false })
            }, 3000);
        },
        /**
         * Enviar a mensage matual digitada no chamado 
         */
        async clickEnviarMensagem() {
            if (!this.isPodeEnviarMensagem) return;

            if (this.estado.isEnviandoMensagemAoServidor) return;

            console.log(`Realizando o envio da mensagem ao chamado..`);
            this.estado.isEnviandoMensagemAoServidor = true;
            this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem = false;

            const solicitaEnviarMensagem = await this.estado.janelaChamado.chamado.enviarMensagem({
                texto: this.estado.janelaChamado.mensagemEnviar.texto,
                tipoAutor: 'atendente'
            })

            // Se ocorreu um erro no envio da mensagem, alertar o usuario
            if (!solicitaEnviarMensagem.isSucesso) {
                this.setAlerta({
                    cor: 'error',
                    texto: `Não foi possível enviar sua mensagem. Motivo: ${solicitaEnviarMensagem.erro.descricao}`,
                    icone: 'mdi-alert',
                    isMostrar: true
                })
            } else {
                this.estado.janelaChamado.mensagemEnviar.texto = undefined;
            }

            this.estado.isEnviandoMensagemAoServidor = false;
            this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem = true;

            this.atualizarBarraDeRolagemChat();
            console.log(`Mensagem enviada com sucesso`);
        },
        /**
         * Cadastrar o listener no chamado para escutar por mensagens do servidor
         */
        cadastrarEscutarPorStreamDeMensagensDoChamado() {
            if (this.estado.janelaChamado.chamado != undefined) {
                if (this.estado.janelaChamado.listeners.onStreamDeMensagem != undefined) {
                    console.log(`Já existe um listener cadastrado para escutar por stream de mensagens no chamado. Removendo antigo..`);
                    this.estado.janelaChamado.listeners.onStreamDeMensagem.excluirListener()
                }

                this.estado.janelaChamado.listeners.onStreamDeMensagem = this.estado.janelaChamado.chamado.onRecebendoStreamMensagem(() => {
                    console.log(`Recebendo nova stream de mensagem no chamado, atualizando scrolling...`);
                    this.atualizarBarraDeRolagemChat();
                })
            }
        },
        /**
         * Remover o listener no chamado que escuta por stream de novas mensagens
         */
        removerEscutarPorStreamDeMensagensDoChamad() {
            if (this.estado.janelaChamado.listeners.onStreamDeMensagem != undefined) {
                console.log(`Removendo escuta de stream de mensagens do chamado`);
                this.estado.janelaChamado.listeners.onStreamDeMensagem.excluirListener()
            }
        },
        /**
        * Cadastrar o listener para escutar por chamados encerrados
        */
        cadastrarEscutarPorChamadoEncerrado() {
            if (this.estado.janelaChamado.chamado != undefined) {

                if (this.estado.janelaChamado.listeners.onChamadoEncerrado != undefined) {
                    console.log(`Já existe um listener cadastrado para escutar por chamado encerrado. Removendo antigo...`);
                    this.estado.janelaChamado.listeners.onChamadoEncerrado.excluirListener();
                }

                this.estado.janelaChamado.listeners.onChamadoEncerrado = this.estado.janelaChamado.chamado.onChamadoEncerrado(() => {
                    console.log(`O chamado foi encerrado, removendo listeners e bloqueando interações...`);

                    this.setAlerta({
                        cor: 'success',
                        texto: 'O chamado atual foi encerrado.',
                        icone: 'mdi-check-bold',
                        isMostrar: true
                    })

                    this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem = false;
                    this.estado.janelaChamado.isChamadoEncerrado = true;

                    this.removerEscutarPorStreamDeMensagensDoChamad();
                    this.removerEscutarPorChamadoEncerrado();
                })
            }
        },
        removerEscutarPorChamadoEncerrado() {
            if (this.estado.janelaChamado.listeners.onChamadoEncerrado != undefined) {
                console.log(`Já existe um listener cadastrado para escutar por chamado encerrado. Removendo antigo...`);
                this.estado.janelaChamado.listeners.onChamadoEncerrado.excluirListener();
            }
        },
        /**
        * Efetuar o encerramento do chamado
        */
        async clickEncerrarChamado() {
            console.log(`Solicitando encerrar chamado ${this.getChamadoID}...`);

            const solicitaEncerrar = await StoreBackend().requisitar('POST', `/chamados/${this.getChamadoID}/encerrar`);
            if (!solicitaEncerrar.isSucesso) {
                console.log(`Erro ao encerrar chamado: ${solicitaEncerrar.erro.descricao}`);
                this.alerta = {
                    isMostrar: true,
                    cor: 'error',
                    texto: `Erro ao encerrar chamado: ${solicitaEncerrar.erro.descricao}`,
                    icone: 'mdi-alert-circle'
                }
                return;
            }

            if (!solicitaEncerrar.sucesso.payload.isSucesso) {
                console.log(`O servidor não aprovou a requisição de encerrar o chamado: ${solicitaEncerrar.sucesso.payload.erro.descricao}`);
                this.alerta = {
                    isMostrar: true,
                    cor: 'error',
                    texto: `Erro ao encerrar chamado: ${solicitaEncerrar.sucesso.payload.erro.descricao}`,
                    icone: 'mdi-alert-circle'
                }
                return;
            }
        },
        /**
       * Dividir a mensagem atual em linhas para exibição(se houver pulos de linha)
       * @returns {String[]}
       */
        formatarMensagemLinha(texto) {
            return texto.texto.split('\n');
        }
    },
    computed: {
        /**
         * Retorna o UUID do chamado
         */
        getChamadoID() {
            return this.propChamadoId;
        },
        isExibirChatPensando() {
            return this.estado.janelaChamado.isExibirChatPensando || this.estado.isEnviandoMensagemAoServidor
        },
        /**
         * Retorna o numero do chamado
         */
        getSequenciaChamado() {
            if (this.estado.triggerChamadoReatividade >= 0 && this.estado.janelaChamado.chamado != undefined) {
                return this.estado.janelaChamado.chamado.sequenciaChamado;
            }
        },
        /**
         * Retorna todas as mensagens contidas no chamado
         */
        getHistoricoMensagens() {
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
            if (this.estado.triggerChamadoReatividade >= 0 && this.estado.janelaChamado.chamado != undefined) {
                for (const mensagemNoChamado of this.estado.janelaChamado.chamado.mensagens) {

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
        },
        /**
         * Retorna as informações de titulo e descrição do chamado
         */
        getProblemaChamado() {
            if (this.estado.triggerChamadoReatividade >= 0) {
                return {
                    titulo: this.estado.janelaChamado.chamado.titulo,
                    descricao: this.estado.janelaChamado.chamado.descricao
                }
            }
        },
        /**
         * Se o usuario pdoe enviar alguma mensagem
         */
        isPodeEnviarMensagem() {

            // Se estiver absolutamente bloqueado de enviar mensagem
            if (!this.estado.janelaChamado.mensagemEnviar.isPodeEnviarMensagem) {
                return false;
            }

            // Se não, validar a mensagem atual digitada
            if (this.estado.janelaChamado.mensagemEnviar.texto == undefined || this.estado.janelaChamado.mensagemEnviar.texto.length <= 3) {
                return false;
            }

            return true;
        }
    },
    watch: {
        propisModalAberto(novoValor) {
            this.dialog.isDialogAberto = novoValor;

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
    <v-dialog v-model="dialog.isDialogAberto" :max-width="`900px`" persistent>

        <v-alert v-model="alerta.isMostrar" :color="alerta.cor" :icon="alerta.icone" :text="alerta.texto"></v-alert>

        <v-card v-if="estado.isChamadoCarregado"
            :title="`Atendimento ao chamado N#${getSequenciaChamado}: ${getProblemaChamado.titulo}`"
            prepend-icon="mdi-message">
            <v-card-text>
                <!-- Titulo e descrição do problema atual -->
                <v-row>
                    <v-col>
                        <p class="text-center">{{ getProblemaChamado.descricao }}</p>
                    </v-col>
                </v-row>
            </v-card-text>

            <p v-if="estado.janelaChamado.isChamadoEncerrado" class="text-center font-weight-bold">O chamado está encerrado
            </p>

            <v-card-actions>
                <v-btn @click="clickFechar()" prepend-icon="mdi-window-minimize" color="primary">Minimizar</v-btn>
                <v-btn v-if="!estado.janelaChamado.isChamadoEncerrado" @click="clickEncerrarChamado()" prepend-icon="mdi-close" color="red">Encerrar</v-btn>
            </v-card-actions>
            <v-divider></v-divider>

            <v-card-text>

                <!-- Bate papo -->
                <v-container ref="historicochat" class="bg-grey-darken-2" style="max-height: 600px; overflow-y: scroll;">
                    <p class="text-center font-weight-bold">Chat</p>
                    <v-divider :thickness="2" color="white" opacity="50%"></v-divider>

                    <v-row class="pa-0 ma-0" v-for="historicoMensagem, index in getHistoricoMensagens">

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

                            <v-col class="pa-1 ma-0 rounded" cols="10">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p>{{ tokenDeTexto }}</p>
                                </div>
                            </v-col>
                        </template>

                        <!-- Mensagem do usuario -->
                        <template v-else-if="historicoMensagem.autor == 'usuario'">
                            <v-col cols="2">
                                <div
                                    v-if="getHistoricoMensagens[index - 1] != undefined && getHistoricoMensagens[index - 1].autor != 'usuario'">
                                    <p class="text-center">
                                        <v-btn icon="mdi-account" variant="text"></v-btn>
                                    </p>
                                    <p class="text-center font-weight-bold">{{ historicoMensagem.nomeAutor }}</p>
                                    <p class="text-center">(Usuário)</p>
                                </div>
                            </v-col>

                            <v-col class="pa-1 ma-0 rounded bg-grey-darken-2" cols="10">
                                <p class="text-left">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p>{{ tokenDeTexto }}</p>
                                </div>
                                </p>
                            </v-col>
                        </template>

                        <!-- Mensagem do atendente -->
                        <template v-else-if="historicoMensagem.autor == 'atendente'">

                            <v-col class="pa-1 ma-0 rounded" cols="10">
                                <p class="text-right">
                                <div v-for="tokenDeTexto in formatarMensagemLinha(historicoMensagem)">
                                    <br v-if="tokenDeTexto == ''">
                                    <p style="display: inline-block;" class="bg-grey-darken-1 rounded-xl pa-2">{{
                                        tokenDeTexto }}</p>
                                </div>
                                </p>
                            </v-col>

                            <v-col cols="2" class="bg-grey-darken-1">
                                <div
                                    v-if="getHistoricoMensagens[index - 1] != undefined && getHistoricoMensagens[index - 1].autor != 'atendente'">
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

                <!-- Conversar -->
                <!-- Texto para enviar mensagem -->
                <v-text-field v-if="!estado.janelaChamado.isChamadoEncerrado" class="bg-grey-darken-2"
                    label="Converse com o usuario aqui" v-model="estado.janelaChamado.mensagemEnviar.texto"
                    density="compact" @keyup.enter="clickEnviarMensagem()">
                    <template v-slot:prepend>
                        <v-btn :disabled="!isPodeEnviarMensagem" :loading="isExibirChatPensando" class="bg-white"
                            @click="clickEnviarMensagem()" icon="mdi-send" color="success" variant="text"></v-btn>
                    </template>

                </v-text-field>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>