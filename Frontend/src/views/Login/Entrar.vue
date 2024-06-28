<script>
import { StoreDeSessao } from '../../stores/StoreSessao';
import { StoreGlobal } from '../../stores/StoreGlobal';
import { pausar } from '../../utils/utils';

export default {
    data() {
        return {
            formulario: {
                isValidado: false,
                campos: {
                    email: {
                        valor: 'admin@admin.com',
                        regras: [(v) => !!v || 'O email é obrigatório', (v) => /.+@.+\..+/.test(v) || 'O email deve ser no padrão nome@email']
                    },
                    senha: {
                        valor: 'adminadmin',
                        regras: [(v) => !!v || 'A senha é obrigatória', (v) => v.length >= 6 || 'A senha deve ter no mínimo 6 caracteres', (v) => v.length <= 12 || 'A senha deve ter no máximo 12 caracteres']
                    }
                }
            },
            estado: {
                alerta: {
                    isExibir: false,
                    cor: '',
                    mensagem: '',
                    icone: ''
                },
                bloquearCardLogin: false,
                isTentandoLogar: false
            }
        }
    },
    emits: ['criar-conta'],
    methods: {
        async iniciarLogin() {
            console.log(`Executando ação de login...`);
            this.estado.isTentandoLogar = true;
            this.estado.alerta.isExibir = false;
            this.estado.bloquearCardLogin = true;

            const tentarIniciarLogin = await StoreDeSessao().autenticar({
                email: this.formulario.campos.email.valor,
                senha: this.formulario.campos.senha.valor
            });


            await pausar(2000);


            // Se autenticou com sucesso
            if (tentarIniciarLogin.isAutenticou) {
                this.estado.alerta = {
                    isExibir: true,
                    cor: 'success',
                    icone: 'mdi-check-bold',
                    mensagem: 'Login efetuado com sucesso. Prosseguindo..!'
                }

                this.estado.isTentandoLogar = false;

                await pausar(2000);

                StoreGlobal().setarEstadoProInicio();
            } else {

                // Ver o motivo de não autenticar pra mostrar a mensagem objetiva
                this.estado.alerta = {
                    cor: 'error',
                    icone: 'mdi-alert-circle',
                    mensagem: ''
                }

                if (tentarIniciarLogin.erro.isCredenciaisIncorretas) {
                    this.estado.alerta.mensagem = `Usuário ou senha incorretos!`;
                } else if (tentarIniciarLogin.erro.isSemConexaoServidor) {
                    this.estado.alerta.mensagem = 'Estamos offline no momento :(';
                } else {
                    this.estado.alerta.mensagem = `${tentarIniciarLogin.erro.descricao}`
                }

                this.estado.alerta.isExibir = true;

                setTimeout(() => {
                    this.estado.isTentandoLogar = false;
                    this.estado.bloquearCardLogin = false;
                }, 2000);
            }
        },
        clickCriarConta() {
            console.log(`Ação clicado para criar a conta`);

            this.$emit('criar-conta');
        }
    },
    computed: {
        /**
         * Se o formulario está validado com inputs corretos
         */
        isFormularioValidado() {
            return this.formulario.isValidado
        },
        /**
         * Retorna se o card deve mostrar o loading
         */
        isLoadingCard() {
            let isLoading = false;

            if (this.estado.isTentandoLogar) {
                isLoading = true;
            }

            return isLoading;
        },
        isBloquearCardLogin() {
            return this.estado.bloquearCardLogin
        }
    }
}
</script>
<template>
    <v-card color="" width="400px" :loading="isLoadingCard" :disabled="isBloquearCardLogin">
        <v-card-title>AUTENTICAÇÃO</v-card-title>
        <v-divider></v-divider>

        <v-alert v-model="estado.alerta.isExibir" :icon="estado.alerta.icone" :color="estado.alerta.cor"
            :text="estado.alerta.mensagem">

        </v-alert>

        <v-card-text>
            <v-form v-model="formulario.isValidado">
                <v-text-field v-model="formulario.campos.email.valor" :rules="formulario.campos.email.regras"
                    prepend-icon="mdi-account" label="Email" type="email" @keyup.enter="iniciarLogin()"></v-text-field>
                <v-text-field v-model="formulario.campos.senha.valor" :rules="formulario.campos.senha.regras"
                    prepend-icon="mdi-lock" label="Senha" type="password" @keyup.enter="iniciarLogin()"></v-text-field>
            </v-form>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="justify-space-around">
            <v-btn style="outline: none;" color="success" variant="elevated"
                :disabled="!isFormularioValidado || isBloquearCardLogin" :loading="isLoadingCard"
                @click="iniciarLogin()">Entrar</v-btn>
            <v-btn style="outline: none;" color="success" variant="text" @click="clickCriarConta()">Novo? Criar
                conta</v-btn>

        </v-card-actions>
    </v-card>
</template>
