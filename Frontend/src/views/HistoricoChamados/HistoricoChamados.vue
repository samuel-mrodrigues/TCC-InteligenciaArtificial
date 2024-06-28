<script>
import { StoreBackend } from '../../stores/StoreBackend';
import HistoricoChamadoVue from "../../components/HistoricoChamado/HistoricoChamado.vue";


/**
* @typedef Chamado
* @property {String} id - ID do chamado(uuid)
* @property {Number} sequencialDoChamado - Numero sequencial do chamado
* @property {String} titulo - Titulo do chamado
* @property {String} descricao - Descrição do chamado
* @property {Object} usuarioAbriu - Informações do usuario que abriu o chamado
* @property {Number} usuarioAbriu.id - ID do usuario
* @property {String} usuarioAbriu.nome - Nome do usuario
* @property {String} usuarioAbriu.email - Email do usuario
* @property {String} dataAbertura - Data de abertura do chamado
* @property {String} dataEncerrado - Data de encerramento do chamado(se encerrado)
* @property {Object} estado - Estado do chamado
* @property {Boolean} estado.isAberto - Se o chamado encontra-se aberto
* @property {Boolean} estado.isEncerrado - Se o chamado encontra-se encerrado, não é possível realizar nenhum tipo de interação
*/

export default {
    components: { HistoricoChamadoVue },
    data() {
        return {
            estado: {
                isExibirModalNovoChamado: false,
                /**
                 * ID passado ao componente de NovoChamado que renderiza o chamado caso o usuario deseje reabrir o chat de um chamado.
                 */
                chamadoAtualPraExibir: undefined,
                chamados: {
                    /**
                     * @type {Chamado[]}
                     */
                    existentes: []
                }
            }
        }
    },
    mounted() {
        this.carregarChamados();
    },
    computed: {
        /**
         * Retorna a lista de chamados existentes atuais
         */
        getChamados() {
            return this.estado.chamados.existentes;
        }
    },
    methods: {
        /**
         * Carregar do servidor os chamados relacionados a esse usuario
         */
        async carregarChamados() {
            console.log(`Carregando chamados existentes do usuario...`);

            const solicitaChamados = await StoreBackend().requisitar('GET', '/chamados');

            if (!solicitaChamados.isSucesso) {
                console.log(`Erro ao carregar chamados: ${solicitaChamados.erro.descricao}`);
                return;
            }

            if (!solicitaChamados.sucesso.payload.isSucesso) {
                console.log(`O servidor não aprovou a requisição de solicitar os chamados existentes: ${solicitaChamados.sucesso.payload.erro.descricao}`);
                return;
            }

            this.estado.chamados.existentes = [];

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
                        id: chamadoObjServidor.usuarioAbriu.id,
                        nome: chamadoObjServidor.usuarioAbriu.nome,
                        email: chamadoObjServidor.usuarioAbriu.email
                    },
                    dataAbertura: chamadoObjServidor.dataAbertura,
                    dataEncerrado: chamadoObjServidor.dataEncerrado,
                    estado: {
                        isAberto: chamadoObjServidor.estado.isAberto,
                        isEncerrado: chamadoObjServidor.estado.isEncerrado
                    }
                }

                this.estado.chamados.existentes.push(novoChamadoParaAdicionar);

            }

            if (this.estado.chamados.existentes.length != 0) {
                console.log(`Foram carregados ${this.estado.chamados.existentes.length} chamados.`);
            } else {
                console.log(`Nenhuma chamado foi encontrado pra esse usuario atual.`);
            }

            console.log(this.estado.chamados.existentes);
        },
        onFechouModalNovoChamado() {
            this.estado.isExibirModalNovoChamado = false;
            this.estado.chamadoAtualPraExibir = undefined;

            this.carregarChamados();
        },
        /**
         * Preparar a abertura do chamado que o usurio clicou
         */
        clickVerChamado(idChamado) {
            console.log(`Usuario clicou para ver o chamado de ID: ${idChamado}`);

            this.estado.chamadoAtualPraExibir = idChamado;

            this.estado.isExibirModalNovoChamado = true;
        },
        fechouVerChamado() {
            console.log(`Clicou pra fechar os chamados...`);
            this.estado.isExibirModalNovoChamado = false;
            this.estado.chamadoAtualPraExibir = undefined;

            this.carregarChamados();
        }
    }
}
</script>


<template>
    <h2 class="text-center pa-5">
        Hístorico de Chamados
    </h2>
    <v-divider></v-divider>

    <div class="d-flex justify-space-between">
        <v-btn @click="carregarChamados()" style="outline: none;" icon="mdi-reload" color="success">
        </v-btn>
    </div>

    <div v-if="getChamados.length == 0">
        <p class="text-center font-weight-bold mt-10">Não existe nenhum chamado existente no momento</p>
    </div>

    <div v-else>
        <p class="text-center font-weight-bold mt-10">Em aberto</p>
        <v-container>
            <v-row>
                <v-col cols="3" v-for="chamado in estado.chamados.existentes.sort((a, b) => b.sequencialDoChamado - a.sequencialDoChamado)">
                    <v-card :color="chamado.estado.isAberto ? 'white' : 'success'"
                        :prepend-icon="chamado.estado.isAberto ? 'mdi-dots-horizontal' : 'mdi-close'"
                        :title="`Chamado N#${chamado.sequencialDoChamado}`">

                        <p class="text-center font-weight-bold">
                            "{{ chamado.titulo }}"
                        </p>

                        <v-btn prepend-icon="mdi-calendar" :ripple="false" variant="text" density="compact">Aberto {{
                            chamado.dataAbertura }}</v-btn>
                        <v-btn v-if="chamado.estado.isEncerrado" prepend-icon="mdi-check" :ripple="false" variant="text"
                            density="compact">Encerrado {{
                                chamado.dataEncerrado }}</v-btn>


                        <v-card-text>{{ chamado.descricao }}</v-card-text>
                        <v-card-actions>
                            <v-divider></v-divider>
                            <v-btn text @click="clickVerChamado(chamado.id)">Ver</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>

    <HistoricoChamadoVue :prop-chamado-id="estado.chamadoAtualPraExibir"
        :propis-modal-aberto="estado.isExibirModalNovoChamado" @fechar="fechouVerChamado()" />
</template>