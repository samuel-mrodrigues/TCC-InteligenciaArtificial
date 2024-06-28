/**
 * O HUB de WebSocket conecta todos os usuarios do frontend ao backend
 */

import { WebSocketERServidor } from "../../utils/ServidorWebSocketER/ServidorWebSocket/Modulo Servidor/servidor/WebSocketERServidor.js";
import { addGET } from "../../index.js";
import { ClienteConectado } from "../../utils/ServidorWebSocketER/ServidorWebSocket/Modulo Servidor/servidor/ServidorWS/ClienteWS/ClienteWS.js";
import { getSessao } from "../usuarios/usuarios.js";
import { copiarParaObjeto } from "../../utils/utils.js";

const HubWebSocketER = new WebSocketERServidor({ isHeadless: true });
/**
 * @typedef Cliente
 * @property {String} tokenSessao - UUID de sessão do cliente
 * @property {Number} ID - ID unico do usuario
 * @property {ClienteConectado} cliente - Instancia de conexão com o cliente
 */

/**
 * Lista de sessões que estão conectados
 * @type {Cliente[]}
 */
const sessoesConectadas = []

/**
 * Realizar o inicio do hub para aceitar as novas conexoes de usuarios
 */
export async function iniciarHub() {
    console.log(`Iniciando HUB WebSocketER`);

    let statusAbertura = await HubWebSocketER.iniciarServidor();
    if (statusAbertura.sucesso) {
        console.log(`HUB WebSocketER aberto e pronto para receber novas conexões}`);
    }

    // Adicionar tratamento quando o cliente se conectar
    HubWebSocketER.onClienteConectado((cliente) => {
        console.log(`Cliente realizou a conexão inicial com o hub`);

        cliente.ISAUTENTICADO = false;

        let idSetTimeout = setTimeout(() => {
            if (cliente.ISAUTENTICADO == false) {
                console.log(`Cliente desconectado ao HUB WebSocketER por não ter se autenticado...`);
                cliente.desconectar();
            } else {
                clearTimeout(idSetTimeout)
            }
        }, 5000);
    })

    HubWebSocketER.adicionarComando('autenticar', (cliente, solicitacao) => {
        const retornoAutenticacao = {
            isSucesso: false,
            erro: {
                descricao: ''
            }
        }

        const payloadEsperado = {
            idTokenAutenticacao: undefined
        }

        copiarParaObjeto(payloadEsperado, solicitacao.payload);

        if (payloadEsperado == undefined) {
            retornoAutenticacao.erro.descricao = 'Token de autenticação não informado';
            return retornoAutenticacao;
        }

        const idTokenCliente = payloadEsperado.idTokenAutenticacao;
        if (idTokenCliente == undefined) {
            console.log(`Cliente conectado ao HUB WebSocketER sem token de sessão. A conexão será recusada.`);
            retornoAutenticacao.erro.descricao = 'Token de autenticação não informado';
            return retornoAutenticacao
        }

        const sessaoDeLogin = getSessao(idTokenCliente);
        if (sessaoDeLogin == undefined) {
            console.log(`Cliente conectado ao HUB WebSocketER com token de sessão inválido. A conexão será recusada.`);
            retornoAutenticacao.erro.descricao = 'Token de autenticação inválido. Tente deslogar e logar novamente';
            return retornoAutenticacao
        }

        let existeSessaoConectada = sessoesConectadas.find(sessao => sessao.tokenSessao == idTokenCliente)
        if (existeSessaoConectada == undefined) {
            console.log(`Novo usuario conectado ao HUB WebSocketER com token de sessão ${idTokenCliente}...`);

            // Se for a primeira conexão do usuario, conectalo
            existeSessaoConectada = {
                cliente: cliente,
                ID: sessaoDeLogin.idUsuario,
                tokenSessao: idTokenCliente
            }

            sessoesConectadas.push(existeSessaoConectada)
        } else {
            // Se ele já tiver no cache, é provavél que tenha alguma conexão aberta ou fechada. Vou atualizar a conexão pela nova recebida

            try {
                existeSessaoConectada.cliente.desconectar();
            } catch (ex) {
            }

            console.log(`Usuario com token de sessão ${idTokenCliente} reconectado ao HUB WebSocketER...`);

            existeSessaoConectada.cliente = cliente;
        }

        cliente.TOKENSESSAO = existeSessaoConectada.tokenSessao;
        cliente.ISAUTENTICADO = true;
        retornoAutenticacao.isSucesso = true;
        return retornoAutenticacao;
    })
}

/**
 * Retorna a instancia do servidor WebSocketER
 */
export function getHubWebSocketER() {
    return HubWebSocketER;
}

/**
 * Retorna a lista de usuarios que estão conectados ao HUB WebSocketER
 */
export function getSessoesConectadas() {
    return sessoesConectadas;
}