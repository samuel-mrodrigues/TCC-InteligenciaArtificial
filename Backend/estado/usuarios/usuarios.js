import { v4 as uuidv4 } from "uuid"

/**
 * @typedef CadastroUsuario
 * @property {Number} id - ID unico
 * @property {String} email - E-mail do usuario
 * @property {String} senha - Senha do usuario
 * @property {String} nome - Nome do usuario
 * @property {Object} permissoes - Detalhes de permissões do usuario
 * @property {Boolean} permissoes.isPermissaoAtendente - Se o usuario tem permissões para atender chamados
 */

/**
 * Lista de usuarios cadastrados
 * @type {CadastroUsuario[]}
 */
const usuariosCadastrados = []

/**
 * @typedef SessaoUsuario
 * @property {String} token - Token de sessão (uuidv4)
 * @property {Number} idUsuario - ID do usuario que o token pertence
 */

/**
 * Lista de sessões de usuarios ativos
 * @type {SessaoUsuario[]}
 */
const sessoesUsuarios = []

/**
* Adicionar um novo usuario a lista de usuarios
* @param {Object} dadosUsuario - Informçoões do usuario 
* @param {String} dadosUsuario.nome - Nome do usuario
* @param {String} dadosUsuario.email - E-mail do usuario
* @param {String} dadosUsuario.senha - Senha do usuario
* @param {Boolean} dadosUsuario.isAtendente - Se deve adicionar o usuario como atendente
* @returns {CadastroUsuario} O usuario cadastrado
*/
export function adicionarUsuario(dadosUsuario) {
    console.log(`Adicionando usuario ${dadosUsuario.nome} (e-mail ${dadosUsuario.email})...`);

    /**
     * @type {CadastroUsuario}
     */
    const novoUsuario = {
        id: usuariosCadastrados.length + 1,
        nome: dadosUsuario.nome,
        senha: dadosUsuario.senha,
        email: dadosUsuario.email,
        permissoes: {
            isPermissaoAtendente: false
        }
    }

    if (dadosUsuario.isAtendente != undefined && dadosUsuario.isAtendente) {
        novoUsuario.permissoes.isPermissaoAtendente = true
    }

    usuariosCadastrados.push(novoUsuario)

    return novoUsuario;
}

/**
 * Retorna os usuarios cadastrados
 * @returns {CadastroUsuario[]}
 */
export function getUsuarios() {
    return usuariosCadastrados;
}

/**
* Excluir um usuario
* @param {Number} id - ID unico do usuario 
* @returns {Boolean} Se encontrou o ID especificado para excluir
*/
export function excluirUsuario(id) {
    /**
     * Se encontrou o ID para excluir
     */
    let isExcluiu = false;


    const usuario = usuariosCadastrados.findIndex((usuario) => usuario.id === id);
    if (usuario >= 0) {
        console.log(`Excluindo usuario com ID ${id}...`);
        isExcluiu = true;
        usuariosCadastrados.splice(usuario, 1);
    } else {
        console.log(`Usuario com ID ${id} não encontrado para excluir...`);
    }

    return isExcluiu;
}

/**
 * Criar um token de autenticação para permitir o usuario acessar os outros endpoints
 * @param {Number} idUsuario 
 * @returns {SessaoUsuario} Dados de autenticação
 */
export function criarTokenAutenticacao(idUsuario) {
    console.log(`Criando token de autenticação para usuario com ID ${idUsuario}...`);

    const token = uuidv4();

    /**
     * @type {SessaoUsuario}
     */
    const sessaoUsuario = {
        token: token,
        idUsuario: idUsuario
    }

    // Remover algum token antigo se existir
    if (sessoesUsuarios.find(sessao => sessao.idUsuario === idUsuario) != undefined) {
        console.log(`Usuario com ID ${idUsuario} já tem uma sessão ativa. Invalidando sessão anterior...`);
        sessoesUsuarios.splice(sessoesUsuarios.findIndex(sessao => sessao.idUsuario === idUsuario), 1);
    }

    sessoesUsuarios.push(sessaoUsuario);

    return sessaoUsuario;
}

/**
 * Retorna as sessões ativas de usuarios
 * @returns {SessaoUsuario[]}
 */
export function getSessoes() {
    return sessoesUsuarios;
}

/**
 * Retorna informações de sessão de um usuario
 * @param {*} id - ID unico numerico do usuario ou UUID do token 
 */
export function getSessao(id) {
    return sessoesUsuarios.find(sessao => sessao.idUsuario == id || sessao.token == id);
}

/**
 * Retorna informações de um usuario
 * @param {Number} id - ID unico do usuario
 */
export function getUsuario(id) {
    return usuariosCadastrados.find(usuario => usuario.id == id);
}

/**
 * Excluir um token de autenticação
 * @param {String} token - Token de autenticação
 */
export function excluirTokenAutenticacao(token) {
    let isExcluiu = false;

    console.log(`Excluindo token de autenticação ${token}...`);

    const sessaoEncontrada = sessoesUsuarios.find(sessao => sessao.token == token);

    if (sessaoEncontrada != undefined) {
        sessoesUsuarios.splice(sessoesUsuarios.indexOf(sessaoEncontrada), 1);
        isExcluiu = true;
    }

    return isExcluiu;
}

let adminUser = adicionarUsuario({
    nome: "Administrador",
    email: "admin@admin.com",
    senha: 'adminadmin',
    isAtendente: true
})

let testeUser = adicionarUsuario({
    nome: "Teste",
    email: "teste@teste.com",
    senha: 'testeteste',
    isAtendente: false
});

sessoesUsuarios.push({
    idUsuario: testeUser.id,
    token: '123'
})