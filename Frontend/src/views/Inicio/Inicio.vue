<script>
import { StoreDeSessao } from '../../stores/StoreSessao';
import { pausar } from '../../utils/utils';

export default {
    name: 'Inicio',
    data() {
        return {
            estado: {
                isDeslogando: false
            }
        }
    },
    methods: {
        async clickDeslogar() {
            if (this.estado.isDeslogando) return;

            this.estado.isDeslogando = true;

            await pausar(2000)
            StoreDeSessao().desautenticar();
        }
    },
    computed: {
        getUsuario() {
            const informacoes = {
                nome: StoreDeSessao().estado.usuario.nome,
                email: StoreDeSessao().estado.usuario.email
            }

            return informacoes;
        },
        isExibirMenuAtendente() {
            return StoreDeSessao().isUsuarioAtendente();
        }
    }
}
</script>

<template>
    <v-layout class="rounded rounded-md">
        <v-navigation-drawer color="grey-darken-4" width="240" permanent>

            <!-- Cara da pessoa -->
            <v-list class="bg-grey-darken-2 rounded-lg">
                <v-list-item density="compact" prepend-icon="mdi-account" :title="getUsuario.nome">

                    <template v-slot:append>
                        <v-btn :loading="estado.isDeslogando" icon="mdi-logout" color="red" size="small" variant="text"
                            style="outline: none;" @click="clickDeslogar()"></v-btn>
                        <v-tooltip activator="parent" text="Clique para deslogar.">

                        </v-tooltip>
                    </template>
                </v-list-item>
            </v-list>
            <v-divider></v-divider>

            <!-- Opções do menu -->
            <v-list>
                <v-list-subheader class="font-weight-bold text-white">Usuario</v-list-subheader>

                <!-- Inicio -->
                <v-list-item to="/" base-color="gray" color="white" variant="text" :value="'inicio'">
                    <template v-slot:prepend>
                        <v-icon icon="mdi-home"></v-icon>
                    </template>

                    <v-list-item-title v-text="`Inicio`"></v-list-item-title>
                </v-list-item>

                <!-- Chamados -->
                <v-list-group value="chamados">
                    <template v-slot:activator="{ props }">
                        <v-list-item v-bind="props" prepend-icon="mdi-message" title="Chamados"></v-list-item>
                    </template>

                    <!-- Abrir um novo chamado -->
                    <v-list-item link to="/servicos/chamados" base-color="gray" color="white" variant="text"
                        :value="'meus_chamados'">

                        <v-tooltip activator="parent">
                            Seus chamados abertos
                        </v-tooltip>

                        <v-list-item-title v-text="`Meus Chamados`"></v-list-item-title>
                    </v-list-item>

                    <!-- Atender chamados -->
                    <v-list-item v-if="isExibirMenuAtendente" link to="/servicos/chamados/atender" base-color="gray"
                        color="white" variant="text" :value="'atender_chamados'">

                        <v-tooltip activator="parent">
                            Atender usuarios que solicitaram assistencia de um humano
                        </v-tooltip>

                        <v-list-item-title v-text="`Atender Chamados`"></v-list-item-title>
                    </v-list-item>

                    <!-- Historico de Chamados -->
                    <v-list-item v-if="isExibirMenuAtendente" link to="/servicos/chamados/historico" base-color="gray"
                        color="white" variant="text" :value="'historico_chamados'">

                        <v-tooltip activator="parent">
                            Visualizar todos os chamados existentes
                        </v-tooltip>

                        <v-list-item-title v-text="`Historico`"></v-list-item-title>
                    </v-list-item>

                </v-list-group>


            </v-list>

        </v-navigation-drawer>

        <!-- <v-app-bar color="grey" height="48" flat></v-app-bar> -->

        <!-- <v-navigation-drawer color="grey-lighten-1" location="right" width="150" permanent></v-navigation-drawer> -->

        <v-main>
            <RouterView />
        </v-main>
    </v-layout>
</template>

<style></style>