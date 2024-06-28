<script>
import { StoreBackend } from '../../stores/StoreBackend';
import AtenderChamado from '../../components/AtenderChamado/AtenderChamado.vue';
import ChatAtendente from '../../components/AtenderChamado/ChatAtendente/ChatAtendente.vue';

/**
* @typedef Chamado
* @property {String} id - ID do chamado(uuid)
* @property {Number} sequencialDoChamado - Numero sequencial do chamado
* @property {String} titulo - Titulo do chamado
* @property {String} descricao - Descrição do chamado
* @property {Object} usuarioAbriu - Informações do usuario que abriu o chamado
* @property {String} usuarioAbriu.nome - Nome do usuario
* @property {String} usuarioAbriu.email - Email do usuario
* @property {String} dataAbertura - Data de abertura do chamado
* @property {String} dataEncerrado - Data de encerramento do chamado(se encerrado)
* @property {Object} estado - Estado do chamado
* @property {Boolean} estado.isAberto - Se o chamado encontra-se aberto
* @property {Boolean} estado.isEncerrado - Se o chamado encontra-se encerrado, não é possível realizar nenhum tipo de interação
* @property {Boolean} estado.isAtendenteAtivo - Se o chamado está ativo para ser atendido por um atendente
* @property {Boolean} estado.isBotAtivo - Se o chamado está ativo para ser atendido pelo bot
*/
export default {
    components: { AtenderChamado, ChatAtendente },
    data() {
        return {
            modal: {
                chatAtendimento: {
                    isExibir: false,
                    idDoChatParaExibir: undefined
                }
            },
            estado: {
                isExibirModalNovoChamado: false,
                chamados: {
                    /**
                     * @type {Chamado[]}
                     */
                    lista: []
                }
            }
        }
    },
    mounted() {
        this.listarChamadosParaAtender();

    },
    methods: {
        async listarChamadosParaAtender() {
            console.log('Solicitando ao servidor a lista de chamados disponiveis para atender');

            const solicitaChamados = await StoreBackend().requisitar('GET', '/chamados');

            if (!solicitaChamados.isSucesso) {
                console.log(`Erro ao carregar chamados: ${solicitaChamados.erro.descricao}`);
                return;
            }

            if (!solicitaChamados.sucesso.payload.isSucesso) {
                console.log(`O servidor não aprovou a requisição de solicitar os chamados existentes: ${solicitaChamados.sucesso.payload.erro.descricao}`);
                return;
            }

            this.estado.chamados.lista = [];

            // Se o servidor retornou as respostas validas do chamados, adicionar ao estado
            for (const chamadoObjServidor of solicitaChamados.sucesso.payload.sucesso.payloadSucesso.chamados) {

                /**
                 * @type {Chamado}
                 */
                const novoChamadoParaAdicionar = {
                    id: chamadoObjServidor.id,
                    sequencialDoChamado: chamadoObjServidor.sequencialDoChamado,
                    titulo: chamadoObjServidor.titulo,
                    descricao: chamadoObjServidor.descricao,
                    usuarioAbriu: {
                        nome: chamadoObjServidor.usuarioAbriu.nome,
                        email: chamadoObjServidor.usuarioAbriu.email
                    },
                    dataAbertura: chamadoObjServidor.dataAbertura,
                    dataEncerrado: chamadoObjServidor.dataEncerrado,
                    estado: {
                        isAberto: chamadoObjServidor.estado.isAberto,
                        isEncerrado: chamadoObjServidor.estado.isEncerrado,
                        isAtendenteAtivo: chamadoObjServidor.estado.isAtendenteAtivo,
                        isBotAtivo: chamadoObjServidor.estado.isBotAtivo
                    }
                }

                // Filtrar somente por chamados em abertos que necessitem de um atendente
                if (novoChamadoParaAdicionar.estado.isAberto && novoChamadoParaAdicionar.estado.isAtendenteAtivo) {

                    this.estado.chamados.lista.push(novoChamadoParaAdicionar);
                }
            }

            if (this.estado.chamados.lista.length != 0) {
                console.log(`Foram carregados ${this.estado.chamados.lista.length} chamados.`);
            } else {
                console.log(`Nenhuma chamado foi encontrado que precise de atendimento humano.`);
            }
        },
        onFechouChat() {
            this.modal.chatAtendimento.isExibir = false;

            this.listarChamadosParaAtender();
        },
        onClicouAtenderChamado(chamadoId) {
            console.log(`Atendente clicou para atender o chamado ${chamadoId}`);

            this.modal.chatAtendimento.idDoChatParaExibir = chamadoId;
            this.modal.chatAtendimento.isExibir = true;
        }
    },
    computed: {
        getChamadosParaAtender() {
            return this.estado.chamados.lista;
        }
    }
}
</script>

<template>
    <h2 class="text-center pa-5">
        Atendimento dos Chamados
    </h2>
    <v-divider></v-divider>
    <v-btn @click="listarChamadosParaAtender()" style="outline: none;" icon="mdi-reload" color="success">
    </v-btn>

    <div v-if="getChamadosParaAtender.length == 0">
        <p class="text-center font-weight-bold mt-10">Não existe nenhum chamado aberto para ser atendido.</p>
    </div>
    <div v-else>
        <v-container>
            <v-row>
                <v-col v-for="chamado in getChamadosParaAtender">
                    <AtenderChamado :prop-chamado="chamado" @atender="onClicouAtenderChamado(chamado.id)"  @chamado-excluido="listarChamadosParaAtender()"/>
                </v-col>
            </v-row>
        </v-container>
    </div>

    <ChatAtendente :propis-modal-aberto="modal.chatAtendimento.isExibir"
        :prop-chamado-id="modal.chatAtendimento.idDoChatParaExibir" @fechar="onFechouChat()" @chamado-fechado="listarChamadosParaAtender()" />
</template>

<style></style>