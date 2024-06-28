/**
 * Esse Store cuida da comunicação com o Backend
 */

import { defineStore } from "pinia"
import axios from "axios";
import { StoreDeSessao } from "./StoreSessao";

export const StoreBackend = defineStore('StoreBackend', {
    state() {
        return {
            backend: {
                ip: 'localhost',
                porta: '3009'
            }
        }
    },
    actions: {
        /**
         * Requisitar um endpoint do backend
         * @param {'GET' | 'POST'} tipo - Tipo de requisição (GET, POST, PUT, DELETE)
         * @param {String} endpoint - Endpoint a ser requisitado
         * @param {Object} corpo - Corpo da requisição
         */
        async requisitar(tipo, endpoint, corpo) {
            /**
             * @typedef HeaderRecebido
             * @property {String} nome - Nome do header
             * @property {String} valor - Valor do header
             */

            const retornoRequisicao = {
                /**
                 * Se a requisição alcançou o servidor
                 */
                isSucesso: false,
                /**
                 * Se a requisição alcançou o servidor, contém a resposta do servidor
                 */
                sucesso: {
                    /**
                     * Payload enviado pelo backend com as informações da requisição
                     */
                    payload: {
                        /**
                         * Se a operação solicitada deu certo
                         */
                        isSucesso: false,
                        /**
                         * Se a operação solicitada deu certo, contém os detalhes da solicitação
                         */
                        sucesso: {
                            descricao: '',
                            /**
                             * Um código curto para a operação que deu certo
                             */
                            codigoSucesso: '',
                            /**
                             * Opcionalmente algum payload adicional que pode ter sido enviado junto
                             */
                            payloadSucesso: {}
                        },
                        /**
                         * Se a operação solicitada não foi aceita pelo backend
                         */
                        erro: {
                            descricao: '',
                            /**
                             * Um código curto do erro
                             */
                            codigoDoErro: '',
                            /**
                             * Opcionalmente algum payload contido no erro para identificar melhor o motivo do erro
                             */
                            payloadErro: {}
                        }
                    },
                    /**
                     * Headers presentes na resposta do servidor
                     * @type {HeaderRecebido[]}
                     */
                    headersRecebidos: []
                },
                /**
                 * Se não sucesso conté mdetalhes do erro
                 */
                erro: {
                    descricao: '',
                    /**
                     * Não deu pra alcançar o servidor
                     */
                    isSemConexaoServidor: false,
                    /**
                     * O servidor foi alcançado mas não retornou as informações do corpo como deviam ser recebidas aqui
                     */
                    isServidorNaoRespondeuDeFormaEsperada: false
                }
            }

            if (endpoint[0] == '/') endpoint = endpoint.substring(1);

            // URL completo da solicitação
            const urlAPI = `http://${this.backend.ip}:${this.backend.porta}/${endpoint}`;

            /**
            * @type {import("axios").AxiosResponse}
            */
            let respostaAxios;

            const headers = {}

            // Se tiver o token de autenticação
            if (StoreDeSessao().getToken() != '') {
                headers['Authorization'] = `Bearer ${StoreDeSessao().getToken()}`
            }

            this.log(`Enviando nova requisição ${tipo} -> ${urlAPI}`);

            // Realizar a solicitação
            switch (tipo) {
                case 'GET': {
                    try {
                        respostaAxios = await axios.get(urlAPI, { headers });
                    } catch (ex) {
                        if (ex.response != undefined) {
                            respostaAxios = ex.response;
                        } else {
                            retornoRequisicao.erro.descricao = `Não foi alcançar o backend. Motivo: ${ex.message}`;

                        }
                    }
                    break;
                }
                case 'POST': {
                    try {
                        respostaAxios = await axios.post(urlAPI, corpo, { headers });
                    } catch (ex) {
                        if (ex.response != undefined) {
                            respostaAxios = ex.response;
                        } else {
                            retornoRequisicao.erro.descricao = `Não foi possível alcançar o backend. Motivo: ${ex.message}`;
                        }
                    }
                    break
                }
            }

            // Sem resposta nenhuma do servidor
            if (respostaAxios == undefined) {
                retornoRequisicao.erro.isSemConexaoServidor = true;
                return retornoRequisicao;
            }

            // Contém a resposta do servidor
            const payloadServidorAPI = respostaAxios.data;
            if (payloadServidorAPI.isSucesso == undefined) {
                retornoRequisicao.erro.descricao = `O servidor não respondeu corretamente com as informações necessarias.`;
                retornoRequisicao.erro.isServidorNaoRespondeuDeFormaEsperada = true;
                return retornoRequisicao;
            }

            retornoRequisicao.isSucesso = true;

            // O servidor não aprovou a solicitação
            if (!payloadServidorAPI.isSucesso) {
                retornoRequisicao.sucesso.payload.erro = {
                    codigoDoErro: payloadServidorAPI.erro.codigo,
                    descricao: payloadServidorAPI.erro.descricao,
                    payloadErro: payloadServidorAPI.erro.dados
                }

                return retornoRequisicao;
            }

            // O servidor aprovou a requisição!
            retornoRequisicao.sucesso = {
                ...retornoRequisicao.sucesso,
                payload: {
                    isSucesso: payloadServidorAPI.isSucesso,
                    sucesso: {
                        codigoSucesso: payloadServidorAPI.sucesso.codigo,
                        descricao: payloadServidorAPI.sucesso.descricao,
                        payloadSucesso: payloadServidorAPI.sucesso.dados
                    }
                }
            }

            // Headers retornados
            for (const keyHeader in respostaAxios.headers) {
                const valorHeader = respostaAxios.headers[keyHeader];

                retornoRequisicao.sucesso.headersRecebidos.push({
                    nome: keyHeader,
                    valor: valorHeader
                })
            }

            return retornoRequisicao;
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
    },
})