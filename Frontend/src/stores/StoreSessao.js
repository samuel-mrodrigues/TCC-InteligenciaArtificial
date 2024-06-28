import { defineStore } from "pinia"
import { StoreBackend } from "./StoreBackend";
import { StoreHubWebSocket } from "./StoreHubWebSocket";
import { EmissorDeEvento } from "../utils/WebSocketERWEBCliente/utils/EmissorDeEvento";

// Emissor de eventos para o Store de Sessão
const emissorEventoStoreSessao = new EmissorDeEvento('StoreSessao');

export const StoreDeSessao = defineStore('StoreSessao', {
    state() {
        return {
            isAutenticado: false,
            estado: {
                /**
                 * O token UUID V4 de autenticação para interagir com o backend
                 */
                tokenAutenticacao: '',
                /**
                 * Se a solicitação de autenticação está sendo realizada
                 */
                isTentandoAutenticar: false,
                usuario: {
                    nome: '',
                    email: '',
                    permissoes: {
                        isAtendente: false
                    }
                }
            }
        }
    },
    actions: {
        /**
         * Retorna se o usuário está autenticado e logado
         */
        estaAutenticado() {
            return this.isAutenticado;
        },
        /**
         * Tentar se autenticar utilizando as credenciais informadas
         * @param {Object} credenciais - Dados de credenciais
         * @param {String} credenciais.email - Nome de usuário
         * @param {String} credenciais.senha - Senha do usuário
         */
        async autenticar(credenciais) {
            this.isAutenticado = false;

            const retornoAutentica = {
                isAutenticou: false,
                erro: {
                    descricao: '',
                    isSemConexaoServidor: false,
                    isCredenciaisIncorretas: false
                }
            }

            if (this.estado.isTentandoAutenticar) {
                this.log('Não é possível autenticar agora, já existe uma solicitação de autenticação em andamento')
                return;
            }

            this.estado.isTentandoAutenticar = true;

            this.log('Enviando solicitação de autenticação ao backend...')
            const respostaLogin = await StoreBackend().requisitar('POST', '/usuarios/login', {
                email: credenciais.email,
                senha: credenciais.senha
            })

            if (!respostaLogin.isSucesso) {
                retornoAutentica.erro.isSemConexaoServidor = true;
            }

            // Payload retornado pelo servidor com os detalhes da solicitação de login
            let payloadSolicitacao = respostaLogin.sucesso.payload;

            if (!payloadSolicitacao.isSucesso) {

                // Se o login não for aprovado, verificar o motivo
                if (payloadSolicitacao.erro.codigoDoErro == 'credenciais-invalidas') {
                    retornoAutentica.erro.descricao = `E-mail ou senha estão incorretos.`;
                    retornoAutentica.erro.isCredenciaisIncorretas = true;
                } else {
                    retornoAutentica.erro.descricao = `Erro desconhecido: ${payloadSolicitacao.erro.descricao}`;
                }

                this.log(`Falha ao autenticar: ${retornoAutentica.erro.descricao}`);
                this.estado.isTentandoAutenticar = false;
                return retornoAutentica;
            }

            console.log(respostaLogin);

            // Se o servidor aprovou, coletar o token de autenticação
            const headerComToken = respostaLogin.sucesso.headersRecebidos.find(header => header.nome.toLowerCase() == 'authorization');
            if (headerComToken != undefined) {
                this.estado.tokenAutenticacao = headerComToken.valor;
                this.isAutenticado = true;
                retornoAutentica.isAutenticou = true;

                this.log(`Autenticado com sucesso. O token de autenticação é ${this.estado.tokenAutenticacao}`);

                this.estado.usuario = {
                    email: `${payloadSolicitacao.sucesso.payloadSucesso.email}`,
                    nome: `${payloadSolicitacao.sucesso.payloadSucesso.nome}`,
                    permissoes: {
                        isAtendente: payloadSolicitacao.sucesso.payloadSucesso.isAtendente
                    }
                }

                // Se autenticado, já solicitar pra se conectar ao hub do WebSocketER também
                StoreHubWebSocket().conectarWebSocket();
                StoreHubWebSocket().verificarConexaoWebSocketER();

                this.getEmissorEventos().disparaEvento('usuario-autenticado');
            } else {
                retornoAutentica.erro.descricao = 'O servidor não retornou o token de autenticação.';
                this.log(`Falha ao autenticar: O servidor não retornou o token de autenticação`);
            }
            this.estado.isTentandoAutenticar = false;
            return retornoAutentica;
        },
        /**
         * Desautenticar o usuário logado atual
         */
        async desautenticar() {
            let retornoLogoff = {
                isSucesso: false,
                erro: {
                    descricao: ''
                }
            }
            this.log('Prosseguindo para desautenticação do usuario...')

            const solicitacaoLogoff = await StoreBackend().requisitar('POST', '/usuarios/logoff');

            if (!solicitacaoLogoff.isSucesso) {
                retornoLogoff.erro.descricao = 'Erro ao desautenticar: Sem conexão com o servidor';
                this.log(`Não foi possível alcançar o servidor para tentar fazer o logoff`);
                return retornoLogoff;
            }

            // O servidor aprovou o logoff!
            if (solicitacaoLogoff.sucesso.payload.isSucesso) {
                retornoLogoff.isSucesso = true;
                this.isAutenticado = false;
                this.estado.tokenAutenticacao = '';
                this.estado.usuario = {
                    nome: '',
                    email: ''
                }
                this.log('Desautenticado com sucesso');

                document.location = '/';

                StoreHubWebSocket().desconectar();
                this.getEmissorEventos().disparaEvento('usuario-desautenticado');
                document.location.reload();
            } else {
                retornoLogoff.erro.descricao = `O servidor não aprovou o logoff ${solicitacaoLogoff.sucesso.payload.erro.descricao}`;
                this.log(`Erro ao desautenticar usuario. O servidor retornou: ${retornoLogoff.erro.descricao}`);
            }
            return retornoLogoff;
        },
        isUsuarioAtendente() {
            return this.estado.usuario.permissoes.isAtendente;
        },
        /**
         * Retorna o emissor de eventos desse Store de Sessão
         */
        getEmissorEventos() {
            return emissorEventoStoreSessao;
        },
        /**
         * Retorna o token de autenticação
         */
        getToken() {
            return this.estado.tokenAutenticacao;
        },
        log(msg) {
            let conteudoMsg = ''
            if (typeof msg == 'object') {
                conteudoMsg = JSON.stringify(msg, null, 4);
            } else {
                conteudoMsg = msg;
            }

            console.log(`[Store ${this.$id}] ${conteudoMsg}`)
        }
    }
})