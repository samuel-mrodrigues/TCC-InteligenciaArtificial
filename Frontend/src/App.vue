<script>
import { StoreDeSessao } from './stores/StoreSessao.js';
import { StoreGlobal } from "./stores/StoreGlobal.js"

import Inicio from './views/Inicio/Inicio.vue';
import Login from './views/Login/Login.vue';

export default {
  components: {
    Inicio,
    Login
  },
  mounted() {
    console.log(`Iniciando funcionalidades...`);

    StoreGlobal().startupStore();
  },
  computed: {
    /**
     * Se a pagian de login deve ser exibida
     */
    isExibirLogin() {
      return StoreGlobal().paginaAtivaAtual == 'login'
    },
    /**
     * Se a pagina de inicio deve ser exibida
     */
    isExibirInicio() {
      return StoreGlobal().paginaAtivaAtual == 'inicio'
    }
  }
}
</script>

<template>
  <Login v-if="isExibirLogin" />

  <Inicio v-else-if="isExibirInicio" />
</template>

<style scoped></style>
