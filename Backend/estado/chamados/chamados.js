/**
 * Estado atual dos chamados existentes
 */
import { v4 as uuidv4 } from "uuid"

import { getSessoesConectadas } from "../hubWebSocket/HubWebSocket.js";
import { getUsuario } from "../usuarios/usuarios.js";
import { adicionarBaseDeDados } from "../llama3/Llama3.js";

/**
 * @typedef PayloadNovoEventoChamado
 * @property {String} idChamado - ID do chamado que o evento ocorreu
 * @property {'mensagemChamado'} tipoDeEvento - Tipo de evento disparado para o chamado
 * @property {PayloadNovaMensagemChamado} mensagemChamado - Detalhes da mensagem que foi enviada se o evento for do tipo de nova mensagem no chamado
 */

/**
 * @typedef PayloadNovaMensagemChamado
 * @property {Number} mensagemSequencia - Sequencia da mensagem no chamado
 * @property {'usuario' | 'bot' | 'atendente'} autor - Origem de quem enviou a mensagem no chamado. Usuario é a pessoa comun abrindo o chamado, bot seria uma resposta da IA e atendente seria uma resposta de um atendente humano interagindo no chat
 * @property {Object} usuario - Se o autor for um usuario, contém os detalhes do usuario
 * @property {Number} usuario.ID - ID do usuario
 * @property {String} usuario.nome - Nome do usuario
 * @property {Object} atendente - Se o autor for um atendente, contém os detalhes do atendente
 * @property {Number} atendente.ID - ID do atendente
 * @property {String} atendente.nome - Nome do atendente
 * @property {'atualizaMensagem' | 'appendMensagem'} tipoDeMensagem - Tipo da mensagem que está sendo notificada.
 * @property {Object} atualizaMensagem - Se o evento de mensagem for do tipo 'atualizaMensagem', contém o texto atualizado da mensagem
 * @property {String} atualizaMensagem.texto - Texto atualizado da mensagem
 * @property {Object} appendMensagem - Se o evento de mensagem for do tipo 'appendMensagem', contém o texto completo da mensagem e o texto que foi appendado
 * @property {String} appendMensagem.textoCompleto - Texto completo da mensagem
 * @property {String} appendMensagem.textoAppendado - Texto que foi appendado
 */

/**
 * Representa uma mensagem de chat
 */
export class Mensagem {
    /**
     * Propriedades da mensagem e suas informações básicas
     */
    propriedades = {
        /**
         * Sequencia da mensagem no chamado
         */
        sequencia: 0,
        /**
         * Data de origem da mensagem
         */
        dataRecebida: new Date(),
        /**
         * Origem de quem enviou a mensagem no chamado. Usuario é a pessoa comun abrindo o chamado, bot seria uma resposta da IA e atendente seria uma resposta de um atendente humano interagindo no chat
         * @type {'usuario' | 'bot' | 'atendente'}
         */
        tipoAutor: '',
        /**
         * Se o autor for um usuario, contém os detalhes do usuario
         */
        usuario: {
            /**
             * ID unico(do cadastro de usuario) do usuario envolvido na mensagem
             */
            ID: ''
        },
        /**
         * Se o autor for um atendente, contém os detalhes do atendente
         */
        atendente: {
            /**
             * ID unico(do cadastro de usuario) do atendente envolvido na mensagem
             */
            ID: ''
        }
    }

    /**
     * Texto da mensagem atual
     */
    textoMensagem = ''

    /**
     * O chamado que a mensagem pertence
     * @type {Chamado}
     */
    chamado = undefined

    /**
     * Instanciar uma mensagem nova
     * @param {Object} mensagemPropriedades - Detalhes da mensagem
     * @param {'bot' | 'usuario' | 'atendente'} mensagemPropriedades.tipoAutor - Origem de quem enviou a mensagem no chamado. Usuario é a pessoa comun abrindo o chamado, bot seria uma resposta da IA e atendente seria uma resposta de um atendente humano interagindo no chat
     * @param {Object} mensagemPropriedades.usuario - Se o autor for um usuario, contém os detalhes do usuario
     * @param {Number} mensagemPropriedades.usuario.ID - ID do usuario
     * @param {Object} mensagemPropriedades.atendente - Se o autor for um atendente, contém os detalhes do atendente
     * @param {Number} mensagemPropriedades.atendente.ID - ID do atendente
     * @param {String} mensagemPropriedades.texto - Texto da mensagem inicialmente. É possível alterar posteriormente com o método setTexto
     * @param {Chamado} chamado - O chamado que a mensagem pertence
     */
    constructor(mensagemPropriedades, chamado) {
        this.chamado = chamado;

        this.propriedades = {
            ...this.propriedades,
            sequencia: this.getChamado().historico.length + 1,
            dataRecebida: new Date(),
            tipoAutor: mensagemPropriedades.tipoAutor,
        }

        this.textoMensagem = '';

        switch (mensagemPropriedades.tipoAutor) {
            case 'atendente': {
                this.propriedades.atendente = {
                    ID: mensagemPropriedades.atendente.ID
                }
                this.log(`Nova mensagem de atendente adicionada.`);
                break;
            }
            case 'usuario': {
                this.propriedades.usuario = {
                    ID: mensagemPropriedades.usuario.ID
                }
                this.log(`Nova mensagem de usuario adicionada.`);
                break;
            }
            case 'bot': {
                this.log(`Nova mensagem de bot adicionada.`);
                break;
            }
            default: {
                throw new Error(`Tipo de autor inválido ${mensagemPropriedades.tipoAutor}`)
            }
        }

        // Se a mensagem tiver um texto inicial, adicionar
        if (mensagemPropriedades.texto != undefined && mensagemPropriedades.texto != '') {
            this.atualizarMensagem(mensagemPropriedades.texto);
        }

    }

    /**
     * Atualizar o texto inteiro da mensagem atual
     */
    atualizarMensagem(mensagem) {
        this.textoMensagem = mensagem;

        this.log(`Mensagem atualizada com novo texto: ${mensagem}`);

        const usuariosInteressados = getSessoesConectadas().filter(sessao => this.chamado.usuariosInteressados.includes(sessao.ID));
        if (usuariosInteressados.length > 0) {

            for (const usuarioConexaoHub of usuariosInteressados) {

                /**
                 * @type {PayloadNovoEventoChamado}
                 */
                let payloadMensagem = {
                    idChamado: this.getChamado().getID(),
                    tipoDeEvento: 'mensagemChamado',
                    mensagemChamado: {
                        tipoDeMensagem: 'atualizaMensagem',
                        mensagemSequencia: this.propriedades.sequencia,
                        autor: this.propriedades.tipoAutor,
                        atualizaMensagem: {
                            texto: this.textoMensagem
                        }
                    }
                }

                // Se o autor for atendente, preencher os dados do atendente
                if (this.propriedades.tipoAutor == 'atendente') {
                    const atendenteSessao = getUsuario(this.propriedades.atendente.ID);

                    // Se existe as informações do usuario
                    if (atendenteSessao != undefined) {
                        payloadMensagem.mensagemChamado.atendente = {
                            nome: atendenteSessao.nome,
                            ID: atendenteSessao.id
                        }
                    }
                }

                // Preencher com os dados do usuario
                if (this.propriedades.tipoAutor == 'usuario') {
                    const usuarioSessao = getUsuario(this.propriedades.usuario.ID);

                    if (usuarioSessao != undefined) {
                        payloadMensagem.mensagemChamado.usuario = {
                            nome: usuarioSessao.nome,
                            ID: usuarioSessao.id
                        }
                    }
                }

                // Notificar cada usuario interessado do evento de append de mensagem
                usuarioConexaoHub.cliente.enviarComando('novo-estado-chamado', payloadMensagem);
            }

        } else {
            this.log(`Nenhum usuario interessado no chamado para notificar dessa mensagem`);
        }
    }

    /**
     * Adicionar mais texto a mensagem atual
     */
    appendMensagem(texto) {
        this.textoMensagem += texto;

        this.log(`Mensagem appendada com novo texto: ${texto}`);

        const usuariosInteressados = getSessoesConectadas().filter(sessao => this.chamado.usuariosInteressados.includes(sessao.ID));
        if (usuariosInteressados.length > 0) {

            for (const usuarioConexaoHub of usuariosInteressados) {

                /**
                 * @type {PayloadNovoEventoChamado}
                 */
                const payloadParaCliente = {
                    idChamado: this.getChamado().getID(),
                    tipoDeEvento: 'mensagemChamado',
                    mensagemChamado: {
                        tipoDeMensagem: 'appendMensagem',
                        mensagemSequencia: this.propriedades.sequencia,
                        autor: this.propriedades.tipoAutor,
                        appendMensagem: {
                            textoCompleto: this.textoMensagem,
                            textoAppendado: texto
                        }
                    }
                }

                // Se o autor for atendente, preencher os dados do atendente
                if (this.propriedades.tipoAutor == 'atendente') {
                    const atendenteSessao = getUsuario(this.propriedades.atendente.ID);

                    // Se existe as informações do usuario
                    if (atendenteSessao != undefined) {
                        payloadMensagem.mensagemChamado.atendente = {
                            nome: atendenteSessao.nome,
                            ID: atendenteSessao.id
                        }
                    }
                }

                // Preencher com os dados do usuario
                if (this.propriedades.tipoAutor == 'usuario') {
                    const usuarioSessao = getUsuario(this.propriedades.usuario.ID);

                    if (usuarioSessao != undefined) {
                        payloadMensagem.mensagemChamado.usuario = {
                            nome: usuarioSessao.nome,
                            ID: usuarioSessao.id
                        }
                    }
                }

                // Notificar cada usuario interessado do evento de append de mensagem
                usuarioConexaoHub.cliente.enviarComando('novo-estado-chamado', payloadParaCliente);
            }

        } else {
            this.log(`Nenhum usuario interessado no chamado para notificar dessa mensagem`);
        }
    }

    /**
     * Retorna o chamado que esta mensagem pertence
     * @returns {Chamado}
     */
    getChamado() {
        return this.chamado;
    }

    log(msg) {
        let conteudoMsg = ''
        if (typeof msg == 'object') {
            conteudoMsg = JSON.stringify(msg, null, 4);
        } else {
            conteudoMsg = msg;
        }

        console.log(`[Chamado #${this.getChamado().getID()}] [Mensagem #${this.propriedades.sequencia}] ${conteudoMsg}`)
    }
}

/**
 * Representa um chamado no sistema
 */
export class Chamado {
    dadosChamado = {
        /**
         * ID unico do chamado(uuid)
         */
        id: '',
        /**
         * Titulo do chamado
         */
        titulo: '',
        /**
         * Descrição do chamado
         */
        descricao: '',
        /**
         * ID do usuario que realizou a abertura do chamado
         */
        idUsuarioAbriu: '',
        /**
         * Data em que foi aberto o chamado
         */
        dataAbertura: undefined,
        /**
         * Data em que o chamado foi encerrado
         */
        dataEncerrado: undefined,
        /**
         * Um sequencial só pra saber qual o N desse chamado
         */
        sequencialNumeroChamado: 0,
    }

    /**
     * Historico de mensagens do chamado
     * @type {Mensagem[]}
     */
    historico = []

    /**
     * Lista de IDs de usuarios interessados no chamado. Esses clientes são notificados quando houver uma nova mensagem no chamado
     * @type {Number[]}
     */
    usuariosInteressados = []

    /**
     * Se a interação com o bot inicial já foi iniciada. Isso evita que o bot seja acionado mais de uma vez para o mesmo chamado
     */
    isBotJaIniciouInteracao = false;

    /**
     * Se o bot está ativo no chamado. Isso significa que o bot está interagindo com o chamado e não existe ainda um atendente no chamado
     */
    isBotAtivo = false;

    /**
     * Se o BOT está pensando pra dar uma resposta.
     */
    isBotEstaPensandoInteracao = false;

    /**
     * Se o chamado encontra-se encerrado. Nenhuma interação é permitida mais.
     */
    isChamadoEncerrado = false;

    /**
     * Se existe pelo menos um atendente ativo no chamado. O BOT não irá se intrometer em chamados que tiverem algum atendente
     */
    isAtendenteAtivo = false;

    /**
     * Instancia um novo chamado
     * @param {Object} chamadoPropriedades - Detalhes do chamado para abrir
     * @param {String} chamadoPropriedades.titulo - Titulo do chamado
     * @param {String} chamadoPropriedades.descricao - Descrição do chamado
     * @param {Number} chamadoPropriedades.idUsuarioAbertura - ID do usuario que abriu o chamado
     */
    constructor(chamadoPropriedades) {

        this.dadosChamado = {
            ...this.dadosChamado,
            id: uuidv4(),
            titulo: chamadoPropriedades.titulo,
            descricao: chamadoPropriedades.descricao,
            idUsuarioAbriu: chamadoPropriedades.idUsuarioAbertura,
            dataAbertura: new Date()
        }

        this.log(`Chamado aberto pelo usuario ${this.dadosChamado.idUsuarioAbriu}`);
    }

    /**
     * Retorna os clientes conectados ao HUB interessados em receber notificações desse chamado
     */
    getClientesInteressadosHub() {
        return getSessoesConectadas().filter(sessao => this.usuariosInteressados.includes(sessao.ID));
    }

    /**
     * Adicionar um novo usuario para ele receber notificações do chamado
     * @param {Number} idUsuario - ID unico do usuario 
     */
    addInteressado(idUsuario) {

        if (this.usuariosInteressados.find(usuarioID => usuarioID == idUsuario) == undefined) {
            this.log(`Usuario ${idUsuario} adicionado como interessado no chamado`);
            this.usuariosInteressados.push(idUsuario);
        } else {
            this.log(`Usuario ${idUsuario} já está adicionado como interessado no chamado`);
        }

    }

    /**
     * Adicionar uma nova mensagem ao historico de chamado
     * @param {Object} mensagemPropriedades - Detalhes da mensagem para adicionar
     * @param {'usuario' | 'bot' | 'atendente'} mensagemPropriedades.autorTipo - Origem de quem enviou a mensagem no chamado. Usuario é a pessoa comun abrindo o chamado, bot seria uma resposta da IA e atendente seria uma resposta de um atendente humano interagindo no chat
     * @param {String} mensagemPropriedades.mensagem - A mensagem enviada
     * @param {Object} mensagemPropriedades.usuario - Se o autor for um usuario, contém os detalhes do usuario
     * @param {Number} mensagemPropriedades.usuario.id - ID do usuario
     * @param {Object} mensagemPropriedades.atendente - Se o autor for um atendente, contém os detalhes do atendente
     * @param {Number} mensagemPropriedades.atendente.id - ID do atendente
     * @returns {Mensagem} A mensagem adicionado
     */
    adicionarMensagem(mensagemPropriedades) {

        const novaMensagem = new Mensagem({
            tipoAutor: mensagemPropriedades.autorTipo,
            texto: mensagemPropriedades.mensagem,
            atendente: mensagemPropriedades.atendente != undefined ? { ID: mensagemPropriedades.atendente.id } : undefined,
            usuario: mensagemPropriedades.usuario != undefined ? { ID: mensagemPropriedades.usuario.id } : undefined
        }, this)

        this.log(`Nova mensagem adicionada ao chamado ${this.dadosChamado.id} pelo autor ${mensagemPropriedades.autorTipo}`);
        this.historico.push(novaMensagem);

        return novaMensagem;
    }

    /**
     * Encerrar o chamado. Nenhuma interação é permitida mais.
     */
    encerrarChamado() {
        this.isChamadoEncerrado = true;
        this.dadosChamado.dataEncerrado = new Date();

        this.isAtendenteAtivo = false;
        this.isBotAtivo = false;
        this.isBotEstaPensandoInteracao = false;

        this.log(`Chamado encerrado`);

        // Notificar interessados que o chamado foi encerrado
        for (const clienteInteressado of this.getClientesInteressadosHub()) {

            let payloadMensagem = {
                idChamado: this.getID(),
                tipoDeEvento: 'chamadoEncerrado',
            }

            clienteInteressado.cliente.enviarComando('novo-estado-chamado', payloadMensagem);
        }

        // Solicitar a atualização da base de dados de chamados
        atualizarBaseDeDadosDeChamados();
    }

    /**
     * Retorna o UUID unico do chamado
     */
    getID() {
        return this.dadosChamado.id;
    }

    log(msg) {
        let conteudoMsg = ''
        if (typeof msg == 'object') {
            conteudoMsg = JSON.stringify(msg, null, 4);
        } else {
            conteudoMsg = msg;
        }

        console.log(`[Chamado #${this.getID()}] ${conteudoMsg}`)
    }
}

/**
 * Lista de chamados existentes
 * @type {Chamado[]}
 */
const chamados = []

/**
 * Adicionar um novo chamado
 * @param {Object} propsChamado - Propriedades do chamado
 * @param {String} propsChamado.titulo - Titulo do chamado
 * @param {String} propsChamado.descricao - Descrição do chamado
 * @param {String} propsChamado.idUsuarioAbertura - ID do usuario que abriu o chamado 
 * @returns {Chamado} Retorna o chamado adicionado
 */
export function addChamado(propsChamado) {
    const novoObjeto = new Chamado({
        titulo: propsChamado.titulo,
        descricao: propsChamado.descricao,
        idUsuarioAbertura: propsChamado.idUsuarioAbertura
    })

    novoObjeto.dadosChamado.sequencialNumeroChamado = chamados.length + 1;

    chamados.push(novoObjeto);
    return novoObjeto;
}

/**
 * Retorna todos os chamados existentes
 * @returns {Chamado[]} 
 */
export function getChamados() {
    return chamados;
}

/**
 * Retorna uma string contendo um compilado de chamados resolvidos
 */
export function getContextoDeChamadosResolvidos() {

}

/**
 * Retorna um chamado específico
 * @param {String} id - UUID do chamado 
 * @returns {Chamado | undefined}
 */
export function getChamado(id) {
    return chamados.find(chamado => chamado.getID() == id);
}

/**
 * Preenche o estado de chamados com chamados de teste
 */
function preencherComChamadosTeste() {
    const chamado1 = addChamado({
        idUsuarioAbertura: 1,
        titulo: 'Problema com a internet',
        descricao: 'A internet está muito lenta e não consigo acessar o site da empresa'
    })

    chamado1.adicionarMensagem({
        autorTipo: 'bot',
        mensagem: 'Olá, vou te ajudar com o seu problema de internet. Vamos verificar o que está acontecendo. Você já testou reiniciar seu computador?'
    })

    chamado1.adicionarMensagem({
        autorTipo: 'usuario',
        mensagem: 'Vou testar aqui agora',
        usuario: {
            id: 1
        }
    })

    chamado1.adicionarMensagem({
        autorTipo: 'usuario',
        mensagem: 'Deu certo, obrigado!',
        usuario: {
            id: 1
        }
    })

    const chamado2 = addChamado({
        idUsuarioAbertura: 1,
        titulo: 'Problema com o ERP da empresa que não abre',
        descricao: 'O meu ERP aqui da empresa não ta abrindo, eu clico e nao acontece nada'
    })
    chamado2.adicionarMensagem({
        autorTipo: 'bot',
        mensagem: 'Olá, vou te ajudar com o seu problema de ERP. Vamos verificar o que está acontecendo. Você já testou reiniciar seu computador?'
    })

    chamado2.adicionarMensagem({
        autorTipo: 'usuario',
        mensagem: 'Eu quero falar com um agente humano',
        usuario: {
            id: 1
        }
    })

    chamado2.adicionarMensagem({
        autorTipo: 'atendente',
        mensagem: 'Opa, bom dia. Geralmente esse problema é causado pois ta faltando um arquivo no local de instalação do programa. Vou precisar que você ligue para o nosso suporte para encaminharmos alguém para te ajudar',
        atendente: {
            id: 1
        }
    })

    const chamado3 = addChamado({
        titulo: 'O site da empresa está dando o erro 404',
        descricao: `Já tentei recarregar o site varias vezes e ele ainda não entra`
    })

    chamado3.adicionarMensagem({
        autorTipo: 'bot',
        mensagem: 'Bom dia! Vou te ajudar com esse problema, vamos tentar reiniciar seu computador primeiro, pode ser?'
    })

    chamado3.adicionarMensagem({
        autorTipo: 'usuario',
        mensagem: 'Vou testar reiniciar aqui então pra ver',
        usuario: {
            id: 1
        }
    })

    chamado3.adicionarMensagem({
        autorTipo: 'bot',
        mensagem: 'Isso, faça um teste e me retorne se deu certo'
    })

    chamado3.adicionarMensagem({
        autorTipo: 'usuario',
        mensagem: 'Não deu certo, ainda não está funcionando.',
        usuario: {
            id: 1
        }
    })

    chamado3.adicionarMensagem({
        autorTipo: 'atendente',
        mensagem: 'Estamos realizando uma manutenção em nosso site no momento, então vai demorar um pouco pra voltar. Peço que você de uma aguardada.',
        atendente: {
            id: 1
        }
    })

    chamado1.encerrarChamado();
    chamado2.encerrarChamado();
    chamado3.encerrarChamado();
}

preencherComChamadosTeste()

/**
 * Função que compila todos os chamados existentes e atualiza a base de dados de chamados pra LLMa conseguir pesquisar
 */
export function atualizarBaseDeDadosDeChamados() {

    for (const chamado of getChamados().filter(chamadoObj => chamadoObj.isChamadoEncerrado)) {
        let compiladoDeChamados = `Titulo: ${chamado.dadosChamado.titulo}\nDescrição: ${chamado.dadosChamado.descricao}\n`

        let compiladoHistoricoChamado = ''
        for (const mensagem of chamado.historico) {

            const getNomeAproprieado = (tipoAutor) => {
                if (tipoAutor == 'bot') return 'Assistente'
                if (tipoAutor == 'usuario') return 'Usuário'
                if (tipoAutor == 'atendente') return 'Atendente Humano'
            }

            compiladoHistoricoChamado += `${getNomeAproprieado(mensagem.propriedades.tipoAutor)}: ${mensagem.textoMensagem}\n`
        }

        compiladoDeChamados += `Historico de Conversa: \n${compiladoHistoricoChamado}`

        adicionarBaseDeDados(`chamado_${chamado.dadosChamado.sequencialNumeroChamado}`, compiladoDeChamados, {
            tituloChamado: chamado.dadosChamado.titulo,
            descricaoChamado: chamado.dadosChamado.descricao
        })
    }

    console.log(`Atualizando a base de dados de chamados...`);
}
