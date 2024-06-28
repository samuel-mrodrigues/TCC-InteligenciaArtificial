<script>
import { StoreBackend } from '../../stores/StoreBackend';


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
    props: {
        propChamado: {
            type: Object,
            required: true
        },
    },
    data() {
        return {
            estado: {
                isChatChamadoAberto: false,
                isSolicitandoEncerrar: false
            },
            alerta: {
                isMostrar: false,
                cor: '',
                texto: '',
                icone: ''
            }
        }
    },
    emits: ['atender', 'chamado-excluido'],
    methods: {
        clickVerChamado() {
            console.log(`Atendente clicou pra visualizar o chamado ${this.getChamado.id}`);

            this.$emit('atender')
        },
        async solicitaEncerrarChamado() {
            console.log(`Solicitando encerrar chamado ${this.getChamado.id}...`);

            const solicitaEncerrar = await StoreBackend().requisitar('POST', `/chamados/${this.getChamado.id}/encerrar`);
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

            // Encerrou com sucesso provavelmente
            this.$emit('chamado-excluido')
        },
    },
    computed: {
        /**
         * Retorna todas as informações do chamado
         * @returns {Chamado}
         */
        getChamado() {
            return this.propChamado;
        }
    }
}
</script>

<template>
    <v-list>
        <v-alert v-model="alerta.isMostrar" :color="alerta.cor" :icon="alerta.icone" :text="alerta.texto"></v-alert>

        <v-list-item>
            <v-list-item-title>
                <v-row>
                    <v-col>
                        <span class="font-weight-bold">Chamado #{{ getChamado.sequencialDoChamado }}</span>
                    </v-col>
                    <v-col>
                        <v-btn @click="clickVerChamado()" color="primary">Atender</v-btn>
                        <v-btn @click="solicitaEncerrarChamado()" color="red"
                            :loading="estado.isSolicitandoEncerrar">Encerrar</v-btn>
                    </v-col>
                </v-row>
            </v-list-item-title>
            <v-list-item-subtitle>
                <v-row>
                    <v-col>
                        <span class="font-weight-bold">Titulo:</span> {{ getChamado.titulo }}
                    </v-col>
                    <v-col>
                        <span class="font-weight-bold">Aberto por:</span> {{ getChamado.usuarioAbriu.nome }}
                    </v-col>
                </v-row>
            </v-list-item-subtitle>
            <v-list-item-subtitle>
                <v-row>
                    <v-col>
                        <span class="font-weight-bold">Data de abertura:</span> {{ getChamado.dataAbertura }}
                    </v-col>
                    <v-col>
                        <span class="font-weight-bold">Estado:</span> {{ getChamado.estado.isAberto ? 'Aberto' :
                            'Encerrado' }}
                    </v-col>
                </v-row>
            </v-list-item-subtitle>
        </v-list-item>
    </v-list>
</template>