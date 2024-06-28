<script>
import Entrar from './Entrar.vue';
import Registrar from './Registrar.vue';

export default {
    components: { Entrar, Registrar },
    data() {
        return {
            tabs: {
                tabAtiva: 'entrar'
            }
        }
    },
    methods: {
        ativarCriarConta() {
            console.log(`Alterado estado de login para criar uma conta`);

            this.tabs.tabAtiva = 'registrar';
        },
        ativarEntrar() {
            console.log(`Alterado estado de login para entrar`);

            this.tabs.tabAtiva = 'entrar';
        }
    }
}
</script>

<template>
    <div class="login">
        <v-tabs-window v-model="tabs.tabAtiva">
            <v-tabs-window-item :value="`entrar`">
                <Entrar @criar-conta="ativarCriarConta()" />
            </v-tabs-window-item>
            <v-tabs-window-item :value="`registrar`">
                <Registrar @entrar="ativarEntrar()" />
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<style>
.login {
      /* margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh; */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  /* transform: translateX(-100%) translateX(-100%); */
}
</style>