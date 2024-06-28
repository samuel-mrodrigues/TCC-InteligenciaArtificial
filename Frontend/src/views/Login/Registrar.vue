<script>
import { StoreBackend } from '../../stores/StoreBackend';
import { pausar } from '../../utils/utils';

export default {
    emits: ['entrar'],
    data() {
        return {
            formulario: {
                isValidado: false,
                campos: {
                    nome: {
                        valor: '',
                        regras: [(v) => !!v || 'O nome é obrigatório', (v) => v.length >= 3 || 'O nome deve ter no mínimo 3 caracteres', (v) => v.length <= 50 || 'O nome deve ter no máximo 50 caracteres']
                    },
                    email: {
                        valor: '',
                        regras: [(v) => !!v || 'O email é obrigatório', (v) => /.+@.+\..+/.test(v) || 'O email deve ser no padrão nome@email']
                    },
                    senha: {
                        valor: '',
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
                bloquearCardRegistrar: false,
                isTentandoRegistrar: false
            }
        }
    },
    methods: {
        clickEntrar() {
            console.log(`Ação para sair do registro e ir pra entrar`);
            this.$emit('entrar')
        },
        resetarCampos() {
            this.formulario.campos.nome.valor = undefined;
            this.formulario.campos.email.valor = undefined;
        },
        /**
         * Tentar realizar o registro solicitando ao servidor
         */
        async tentarRegistrar() {
            if (!this.isFormularioValidado) return;

            this.estado.isTentandoRegistrar = true;
            this.estado.bloquearCardRegistrar = true;

            await pausar(2000)
            console.log(`Ènviando solicitação de registro ao servidor...`);
            const solicitaCriarConta = await StoreBackend().requisitar('POST', `/usuarios`, {
                email: this.formulario.campos.email.valor,
                nome: this.formulario.campos.nome.valor,
                senha: this.formulario.campos.senha.valor
            })

            this.estado.alerta = {
                cor: 'error',
                icone: 'mdi-alert',
                isExibir: true,
                mensagem: ''
            }

            // Sem conexão com o servidor
            if (!solicitaCriarConta.isSucesso) {
                this.estado.isTentandoRegistrar = false;
                this.estado.bloquearCardRegistrar = false;

                this.estado.alerta.mensagem = 'Sem conexão com o servidor. Tente novamente mais tarde'

                return;
            }

            // Se a requisição chegou ao servidor pelo menos
            if (!solicitaCriarConta.sucesso.payload.isSucesso) {

                switch (solicitaCriarConta.sucesso.payload.erro.codigoDoErro) {
                    case 'email-em-uso': {
                        this.estado.alerta.mensagem = `Email (${this.formulario.campos.email.valor}) já está em uso. Tente outro email`
                        break;
                    }
                    default: {
                        this.estado.alerta.mensagem = `${solicitaCriarConta.sucesso.payload.erro.descricao}`
                        break;
                    }
                }
                this.estado.isTentandoRegistrar = false;
                this.estado.bloquearCardRegistrar = false;
                return;
            }

            // Se chegou até aqui, o registro foi efetuado com sucesso
            this.estado.alerta = {
                cor: 'success',
                icone: 'mdi-check-bold',
                isExibir: true,
                mensagem: 'Registro efetuado com sucesso. Redirecionando para a tela de login...'
            }

            this.estado.isTentandoRegistrar = false;
            setTimeout(() => {
                this.clickEntrar();
                this.estado.bloquearCardRegistrar = false;
            }, 2000);
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

            if (this.estado.isTentandoRegistrar) {
                isLoading = true;
            }

            return isLoading;
        },
        isBloquearCard() {
            return this.estado.bloquearCardRegistrar
        }
    }
}
</script>

<template>
    <v-card color="" width="400px" :loading="isLoadingCard" :disabled="isBloquearCard">
        <v-card-title>REGISTRO</v-card-title>
        <v-divider></v-divider>

        <v-alert v-model="estado.alerta.isExibir" :icon="estado.alerta.icone" :color="estado.alerta.cor"
            :text="estado.alerta.mensagem">

        </v-alert>

        <v-card-text>
            <v-form v-model="formulario.isValidado">
                <v-text-field v-model="formulario.campos.nome.valor" :rules="formulario.campos.nome.regras"
                    prepend-icon="mdi-card-account-details" label="Nome" type="text"
                    @keyup.enter="tentarRegistrar()"></v-text-field>

                <v-text-field v-model="formulario.campos.email.valor" :rules="formulario.campos.email.regras"
                    prepend-icon="mdi-account" label="Email" type="email" @keyup.enter="tentarRegistrar()"></v-text-field>
                <v-text-field v-model="formulario.campos.senha.valor" :rules="formulario.campos.senha.regras"
                    prepend-icon="mdi-lock" label="Senha" type="password" @keyup.enter="tentarRegistrar()"></v-text-field>
            </v-form>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="justify-space-around">
            <v-btn style="outline: none;" color="success" variant="elevated"
                :disabled="!isFormularioValidado || isBloquearCard" :loading="isLoadingCard"
                @click="tentarRegistrar()">Registrar</v-btn>
            <v-btn style="outline: none;" color="success" variant="text" @click="clickEntrar()">Já tem conta?
                Entrar</v-btn>

        </v-card-actions>
    </v-card>
</template>