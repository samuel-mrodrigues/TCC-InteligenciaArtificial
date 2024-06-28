<script>
import Chat from '../../components/Chat/Chat.vue';
import NovoChamado from '../../components/NovoChamado/NovoChamado.vue';
import { StoreBackend } from '../../stores/StoreBackend';
import { StoreDeSessao } from '../../stores/StoreSessao';

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
    components: { Chat, NovoChamado },
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

                // Filtrar somente por chamados em abertos que necessitem de um atendente
                if (novoChamadoParaAdicionar.usuarioAbriu.email == StoreDeSessao().estado.usuario.email) {
                    console.log(`Adicionando novo chamado para o usuario ${novoChamadoParaAdicionar.usuarioAbriu.email}`);
                    this.estado.chamados.existentes.push(novoChamadoParaAdicionar);
                } else {
                    console.log(`ignorando chamado de outro usuario ${novoChamadoParaAdicionar.usuarioAbriu.email} (diferente do usuario logado com email ${StoreDeSessao().estado.usuario.email})`);
                }

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
        async clickEncerrarChamado(idChamado) {
            console.log(`Solicitando encerrar chamado ${idChamado}...`);

            const solicitaEncerrar = await StoreBackend().requisitar('POST', `/chamados/${idChamado}/encerrar`);
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

            console.log(`Chamado excluido com sucess`);
            this.carregarChamados();
        }

    }
}
</script>

<template>
    <h2 class="text-center pa-5">
        Meus Chamados
    </h2>
    <v-divider></v-divider>

    <div class="d-flex justify-space-between">
        <v-btn style="outline: none;" prepend-icon="mdi-plus" color="primary"
            @click="estado.isExibirModalNovoChamado = true">Abrir chamado
        </v-btn>
        <v-btn @click="carregarChamados()" style="outline: none;" icon="mdi-reload" color="success">
        </v-btn>
    </div>

    <div v-if="getChamados.length == 0">
        <p class="text-center font-weight-bold mt-10">Não existe nenhum chamado
            que seja seu aberto no momento.</p>
    </div>

    <div v-else>
        <p class="text-center font-weight-bold mt-10">Em aberto</p>
        <v-container>
            <v-row>
                <v-col cols="3"
                    v-for="chamado in estado.chamados.existentes.filter(chamadoObj => chamadoObj.estado.isAberto)">
                    <v-card color="white" prepend-icon="mdi-message" :title="`Chamado N#${chamado.sequencialDoChamado}`">

                        <p class="text-center font-weight-bold">
                            "{{ chamado.titulo }}"
                        </p>

                        <v-card-text>{{ chamado.descricao }}</v-card-text>
                        <v-card-actions>
                            <v-divider></v-divider>
                            <v-btn color="primary" text @click="clickVerChamado(chamado.id)">Ver</v-btn>
                            <v-btn color="red" text @click="clickEncerrarChamado(chamado.id)">Encerrar</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>

        <v-divider></v-divider>
        <p class="text-center font-weight-bold mt-10">Encerrados</p>

        <v-container>
            <v-row>
                <v-col cols="3"
                    v-for="chamado in estado.chamados.existentes.filter(chamadoObj => chamadoObj.estado.isEncerrado)">
                    <v-card color="green-darken-2" prepend-icon="mdi-check-bold">

                        <template v-slot:title>
                            <p>{{ `Chamado N#${chamado.sequencialDoChamado}` }}</p>
                        </template>
                        <v-divider></v-divider>

                        <v-btn prepend-icon="mdi-calendar" :ripple="false" variant="text" density="compact">Aberto {{
                            chamado.dataAbertura }}</v-btn>
                        <v-btn prepend-icon="mdi-check" :ripple="false" variant="text" density="compact">Encerrado {{
                            chamado.dataEncerrado }}</v-btn>

                        <v-divider></v-divider>

                        <p class="text-white text-center font-weight-bold pt-2 text-decoration-underline">
                            "{{ chamado.titulo }}"
                        </p>

                        <v-card-text>{{ chamado.descricao }}</v-card-text>
                        <v-card-actions>
                            <v-divider></v-divider>
                            <v-btn color="white" text @click="clickVerChamado(chamado.id)">Visualizar</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>



    <NovoChamado :prop-abrir-modal="estado.isExibirModalNovoChamado" :prop-chamadoid-reabrir="estado.chamadoAtualPraExibir"
        @fechar="onFechouModalNovoChamado()" />
</template>

<style></style>