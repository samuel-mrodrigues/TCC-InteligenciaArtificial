/**
 * Esse cara cadastrar todos os endpoints existentes na aplicação
 */

import { cadastrar as cadastrarEndpointsUsuarios } from "./usuarios/usuarios.js";
import { cadastrar as cadastrarEndpointsHubWebSockets } from "./hubwebsocket/hubwebsocket.js";
import { cadastrar as cadastrarEndpointsChamados } from "./chamados/chamados.js";

export function cadastrar() {
    console.log(`Cadastro de endpoints...`);

    cadastrarEndpointsUsuarios();
    cadastrarEndpointsHubWebSockets();
    cadastrarEndpointsChamados();
}