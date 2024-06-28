/**
 * Trata do endpoint onde clientes se conectam ao hub de WebSocket
 */

import { addGET } from "../../index.js";
import { getHubWebSocketER } from "../../estado/hubWebSocket/HubWebSocket.js";
import { getSessoes } from "../../estado/usuarios/usuarios.js";

/**
 * Realizar o cadastro dos endpoints
 */
export function cadastrar() {
    cadastraEndpointConectar();
}

function cadastraEndpointConectar() {
    addGET('/hubwebsocket/conectar', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de conexão ao HUB WebSocketER recebida...`);

        const hubWebSocketER = getHubWebSocketER();
        hubWebSocketER.getGerenciadorWebSocket().adicionarClienteHTTPGet(requisicao.parametros.requisicaoOriginal.requisicao, requisicao.parametros.requisicaoOriginal.resposta.socket);
    })
}