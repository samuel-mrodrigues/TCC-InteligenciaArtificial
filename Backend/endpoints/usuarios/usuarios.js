/**
 * Trata dos endpoints relacionados aos usuarios
 */

import { addGET, addPOST } from "../../index.js";
import { adicionarUsuario, criarTokenAutenticacao, getUsuarios, excluirTokenAutenticacao, getSessoes } from "../../estado/usuarios/usuarios.js";

/**
 * Cadastra os endpoints de usuario
 */
export function cadastrar() {
    console.log(`Cadastro de endpoints de usuarios...`);

    cadastraEndpointRegistraUsuario();
    cadastraEndpointLoginUsuario();
    cadastraEndPointLogoffUsuario();
}

/**
 * Cadastra o endpoint de registro
 */
function cadastraEndpointRegistraUsuario() {
    console.log(`Cadastrando endpoint de registro de usuario...`);

    addPOST('/usuarios', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de registro de usuario recebida...`);

        /**
         * @typedef PayloadCadastroUsuario
         * @property {String} nome - Nome do usuario
         * @property {String} email - E-mail do usuario
         * @property {String} senha - Senha do usuario
         */

        /**
         * @type {PayloadCadastroUsuario}
         */
        const payloadCadastro = requisicao.getBody();

        if (payloadCadastro.email == undefined || payloadCadastro.email.match(/.+@.+\..+/) == null) {
            return requisicao.recusar('email-invalido', 'O e-mail informado é inválido').devolverResposta();
        }

        if (getUsuarios().find(usuario => usuario.email == payloadCadastro.email) != undefined) {
            return requisicao.recusar('email-em-uso', `O e-mail informado (${payloadCadastro.email}) já está em uso`).devolverResposta();
        }

        if (payloadCadastro.senha == undefined || payloadCadastro.senha.length < 6) {
            return requisicao.recusar('senha-invalida', 'A senha informada é inválida').devolverResposta();
        }

        if (payloadCadastro.nome == undefined || payloadCadastro.nome.length < 3) {
            return requisicao.recusar('nome-invalido', 'O nome informado é inválido').devolverResposta();
        }

        // Se estiver tudo joia, permitir o cadastro
        const usuarioCadastrado = adicionarUsuario({
            nome: payloadCadastro.nome,
            email: payloadCadastro.email,
            senha: payloadCadastro.senha
        });

        return requisicao.aprovar('usuario-cadastrado', 'Usuario cadastrado com sucesso', {
            nome: usuarioCadastrado.nome,
            email: usuarioCadastrado.email
        }).devolverResposta();
    });
}

/**
 * Cadastra o endpoint de login 
 */
function cadastraEndpointLoginUsuario() {
    console.log(`Cadastrando endpoint de login de usuario...`);
    addPOST('/usuarios/login', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de login de usuario recebida...`);

        /**
         * @typedef PayloadLoginUsuario
         * @property {String} email - E-mail do usuario
         * @property {String} senha - Senha do usuario
         */

        /**
         * @type {PayloadLoginUsuario}
         */
        const payloadLogin = requisicao.getBody();

        if (payloadLogin.email == undefined || payloadLogin.email.match(/.+@.+\..+/) == null) {
            return requisicao.recusar('email-invalido', 'O e-mail informado é inválido').devolverResposta();
        }

        if (payloadLogin.senha == undefined || payloadLogin.senha.length < 6) {
            return requisicao.recusar('senha-invalida', 'A senha informada é inválida').devolverResposta();
        }

        const usuarioEncontrado = getUsuarios().find(usuario => usuario.email == payloadLogin.email && usuario.senha == payloadLogin.senha);

        if (usuarioEncontrado == undefined) {
            return requisicao.recusar('credenciais-invalidas', 'Credenciais inválidas').devolverResposta();
        }

        // Gerar o token de autenticação
        const tokenDeAutenticacao = criarTokenAutenticacao(usuarioEncontrado.id);

        requisicao.parametros.requisicaoOriginal.resposta.setHeader('Authorization', tokenDeAutenticacao.token);

        return requisicao.aprovar('usuario-logado', 'Usuario logado com sucesso', {
            nome: usuarioEncontrado.nome,
            email: usuarioEncontrado.email,
            isAtendente: usuarioEncontrado.permissoes.isPermissaoAtendente
        }).devolverResposta();
    });
}

/**
 * Cadastra o endpoint de logoff
 */
function cadastraEndPointLogoffUsuario() {
    console.log(`Cadastrando endpoint de logoff de usuario...`);
    addPOST('/usuarios/logoff', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de logoff de usuario recebida...`);

        let headerBearer = requisicao.parametros.requisicaoOriginal.requisicao.headers['authorization'];
        if (headerBearer == undefined) {
            return requisicao.recusar('token-invalido', 'O token de autorização não foi informado').devolverResposta();
        }

        let tokenBearer = headerBearer.split(' ')[1];
        if (tokenBearer == undefined) {
            return requisicao.recusar('token-invalido', 'O token de autorização não foi informado').devolverResposta();
        }

        if (tokenBearer == undefined) {
            return requisicao.recusar('token-invalido', 'O token informado é inválido').devolverResposta();
        }

        const sessaoEncontrada = getSessoes().find(sessao => sessao.token == tokenBearer);

        if (sessaoEncontrada == undefined) {
            return requisicao.recusar('sessao-nao-encontrada', 'Sessão não encontrada pelo ID de sessão informado').devolverResposta();
        }

        const isExcluiuTokenSucesso = excluirTokenAutenticacao(sessaoEncontrada.token);
        if (!isExcluiuTokenSucesso) {
            return requisicao.recusar('erro-ao-excluir-token', 'Erro ao excluir token').devolverResposta();
        }

        return requisicao.aprovar('usuario-deslogado', 'Usuario deslogado com sucesso').devolverResposta();
    });
}