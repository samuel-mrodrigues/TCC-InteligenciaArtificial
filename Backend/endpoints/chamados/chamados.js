/**
 * Trat dos endpoints relacionados ao chamado
 */

import { addGET, addPOST, formatarDataParaString } from "../../index.js";
import { getSessoes, getUsuario } from "../../estado/usuarios/usuarios.js";
import { Chamado, addChamado, getChamado, getChamados } from "../../estado/chamados/chamados.js";
import { getHubWebSocketER } from "../../estado/hubWebSocket/HubWebSocket.js";
import { copiarParaObjeto, pausar, } from "../../utils/utils.js";
import { executarPromptLlama3, instanciarChatLLama3 } from "../../estado/llama3/Llama3.js";

/**
 * Realiza o cadastro de comunicação com o endpoint de chamados
 */
export function cadastrar() {
    console.log(`Cadastrando endpoints de chamados...`);

    cadastrarAbrirChamado();
    cadastrarConectarBatepapoChamado();
    cadastrarInteragirBatePapoChamado();
    cadastrarInteragirEstadoChamado();
    cadastrarRetornarChamados();
    cadastrarEncerrarChamado();
}

/**
 * Cadastra o endpoint de abrir um chamado no sistema
 */
function cadastrarAbrirChamado() {
    console.log(`Cadastrando endpoints para abrir chamados...`);

    addPOST('/chamados', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de abertura de chamado recebida...`);

        const corpo = requisicao.getBody();

        if (corpo.titulo == undefined || corpo.titulo == '') {
            requisicao.recusar('titulo-invalido', 'O titulo do chamado não pode ser vazio').devolverResposta();
            return
        }

        if (corpo.descricao == undefined || corpo.descricao == '') {
            requisicao.recusar('descricao-invalida', 'A descrição do chamado não pode ser vazia').devolverResposta();
            return
        }

        // Agora posso criar o chamado
        let bearerToken = requisicao.getBearerToken();

        // Pegar o usuario que está abrindo o chamado
        const sessaoUsuario = getSessoes().find(sessao => sessao.token == bearerToken);
        if (sessaoUsuario == undefined) {
            requisicao.recusar('nao-autorizado', 'Token de autenticação do usuario não encontrado.').devolverResposta();
            return;
        }

        // Realizar a adição do chamado ao estado
        const novoChamado = addChamado({
            titulo: corpo.titulo,
            descricao: corpo.descricao,
            idUsuarioAbertura: sessaoUsuario.idUsuario
        })

        requisicao.aprovar('chamado-criado', `Chamado ${novoChamado.getID()} criado com sucesso`, {
            idChamado: novoChamado.getID()
        }).devolverResposta();
    })
}

/**
 * Cadastra o endpoint de retornar os chamados do usuario
 */
function cadastrarRetornarChamados() {
    addGET('/chamados', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de retorno de chamados recebida...`);

        let bearerToken = requisicao.getBearerToken();

        // Pegar o usuario que está abrindo o chamado
        const sessaoUsuario = getSessoes().find(sessao => sessao.token == bearerToken);
        if (sessaoUsuario == undefined) {
            requisicao.recusar('nao-autorizado', 'Token de autenticação do usuario não encontrado.').devolverResposta();
            return;
        }

        const usuarioCadastro = getUsuario(sessaoUsuario.idUsuario);
        if (usuarioCadastro == undefined) {
            requisicao.recusar('usuario-nao-encontrado', 'Usuario não encontrado no sistema').devolverResposta();
            return;
        }

        /**
         * @typedef Chamado
         * @property {String} id - ID do chamado(uuid)
         * @property {Number} sequencialDoChamado - Numero sequencial do chamado
         * @property {String} titulo - Titulo do chamado
         * @property {String} descricao - Descrição do chamado
         * @property {Object} usuarioAbriu - Informações do usuario que abriu o chamado
         * @property {Number} usuarioAbriu.id - ID do usuario
         * @property {String} usuarioAbriu.nome - Nome do usuario
         * @property {String} usuarioAbriu.email - Email do usuario
         * @property {String} dataAbertura - Data de abertura do chamado
         * @property {String} dataEncerrado - Data de encerramento do chamado(se encerrado)
         * @property {Object} estado - Estado do chamado
         * @property {Boolean} estado.isAberto - Se o chamado encontra-se aberto
         * @property {Boolean} estado.isEncerrado - Se o chamado encontra-se encerrado, não é possível realizar nenhum tipo de interação
         * @property {Boolean} estado.isAtendenteAtivo - Se o chamado está ativo para ser atendido por um atendente
         * @property {Boolean} estado.isBotAtivo - Se o chamado está ativo para ser atendido pelo bot
         */

        /**
         * @type {Chamado[]}
         */
        let chamadosParaRetornar = [];
        // Realizar a adição do chamado ao estado

        let chamadosExistentes = []

        if (usuarioCadastro.permissoes.isPermissaoAtendente) {
            // Se o usuario for um admin, ele pode ver todos os chamados
            chamadosExistentes = getChamados();
        } else {
            // Se for um usuario comum, ele só pode ver os chamados que ele abriu
            chamadosExistentes = getChamados().filter(chamado => chamado.dadosChamado.idUsuarioAbriu == sessaoUsuario.idUsuario);
        }

        chamadosParaRetornar = chamadosExistentes.map(chamadoObj => {

            /**
             * Novo chamado pra adicionar na lista de retorno dos chamados
             * @type {Chamado}
             */
            const novoObjetoChamado = {
                id: chamadoObj.dadosChamado.id,
                sequencialDoChamado: chamadoObj.dadosChamado.sequencialNumeroChamado,
                titulo: chamadoObj.dadosChamado.titulo,
                descricao: chamadoObj.dadosChamado.descricao,
                dataAbertura: formatarDataParaString(chamadoObj.dadosChamado.dataAbertura, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%'),
                dataEncerrado: chamadoObj.dadosChamado.dataEncerrado == undefined ? '' : formatarDataParaString(chamadoObj.dadosChamado.dataEncerrado, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%'),
                usuarioAbriu: {
                    id: '',
                    nome: '',
                    email: ''
                },
                estado: {
                    isAberto: chamadoObj.isChamadoEncerrado == false,
                    isEncerrado: chamadoObj.isChamadoEncerrado,
                    isAtendenteAtivo: chamadoObj.isAtendenteAtivo,
                    isBotAtivo: chamadoObj.isBotAtivo
                }
            }

            const infoUserDoChamado = getUsuario(chamadoObj.dadosChamado.idUsuarioAbriu);
            if (infoUserDoChamado != undefined) {
                novoObjetoChamado.usuarioAbriu = {
                    id: infoUserDoChamado.id,
                    nome: infoUserDoChamado.nome,
                    email: infoUserDoChamado.email
                }
            }

            return novoObjetoChamado;
        })


        requisicao.aprovar('chamados-retornados', `Chamados retornados com sucesso.`, {
            chamados: chamadosParaRetornar
        }).devolverResposta();
    });
}

function cadastrarEncerrarChamado() {
    addPOST('/chamados/:idChamado/encerrar', (requisicao) => {
        console.log(`Requisição ${requisicao.uuid} de retorno de chamados recebida...`);

        let bearerToken = requisicao.getBearerToken();

        // Pegar o usuario que está abrindo o chamado
        const sessaoUsuario = getSessoes().find(sessao => sessao.token == bearerToken);
        if (sessaoUsuario == undefined) {
            requisicao.recusar('nao-autorizado', 'Token de autenticação do usuario não encontrado.').devolverResposta();
            return;
        }

        const usuarioCadastro = getUsuario(sessaoUsuario.idUsuario);
        if (usuarioCadastro == undefined) {
            requisicao.recusar('usuario-nao-encontrado', 'Usuario não encontrado no sistema').devolverResposta();
            return;
        }

        const idChamado = requisicao.getParametrosURL().idChamado;

        const informacoesChamado = getChamado(idChamado);
        if (informacoesChamado == undefined) {
            requisicao.recusar('chamado-nao-encontrado', `Chamado não encontrado no sistema pelo UUID ${idChamado}`).devolverResposta();
            return;
        }

        if (usuarioCadastro.permissoes.isPermissaoAtendente == false && informacoesChamado.dadosChamado.idUsuarioAbriu != sessaoUsuario.idUsuario) {
            requisicao.recusar('nao-autorizado', 'Você não tem permissão para encerrar chamados de outros usuários.').devolverResposta();
            return;
        }

        informacoesChamado.encerrarChamado();

        requisicao.aprovar('chamado-encerrado', `Chamado ${informacoesChamado.getID()} encerrado com sucesso`).devolverResposta();
        return;
    });
}

/**
 * Cadastra o comando no servidor HUB WebSocktER para que o frontend consiga estabelecer a comunicação em tempo real do bate papo dos chamados
 */
function cadastrarConectarBatepapoChamado() {
    getHubWebSocketER().adicionarComando('conectar-batepapo-chamado', (cliente, solicitacao) => {
        /**
         * Esse payload será retornado ao cliente como resposta de sua solicitação de tentar se conectar ao bate papo do chamado
         */
        const payloadRetorno = {
            /**
             * Se foi aprovado a solicitação de estabelecer a conexão do bate papo ou não
             */
            isSucesso: false,
            erro: {
                descricao: '',
                isChamadoNaoExiste: false,
                NaoAutenticado: false
            }
        }

        /**
         * Payload que o cliente envia com as informações do chamado que ele quer abrir o bate papo
         */
        const payloadEsperado = {
            idDoChamado: undefined
        }


        copiarParaObjeto(payloadEsperado, solicitacao.payload);

        if (payloadEsperado.idDoChamado == undefined) {
            payloadRetorno.erro.descricao = 'O id do chamado não foi informado';
            return payloadRetorno;
        }

        const informacoesDoChamado = getChamado(payloadEsperado.idDoChamado);
        if (informacoesDoChamado == undefined) {
            payloadRetorno.erro.descricao = 'O chamado informado não foi encontrado';
            payloadRetorno.erro.isChamadoNaoExiste = true;
            return payloadRetorno;
        }

        // O token de sessão que a conexão está vinculada
        const tokenDeSessaoDoCliente = cliente.TOKENSESSAO;

        const sessaoUsuario = getSessoes().find(sessao => sessao.token == tokenDeSessaoDoCliente);
        if (sessaoUsuario == undefined) {
            payloadRetorno.erro.descricao = 'O token de sessão do cliente vinculado na sua conexão atual não foi encontrado nas sessões. Tente se logar novamente.';
            payloadRetorno.erro.NaoAutenticado = true;
            return payloadRetorno;
        }

        // Adicionar o usuario como interessado no chamado para ele receber as notificações
        informacoesDoChamado.addInteressado(sessaoUsuario.idUsuario);

        console.log(`Adicionado novo usuario ID ${sessaoUsuario.idUsuario} interessado ao chamado ID ${informacoesDoChamado.getID()}`);
        payloadRetorno.isSucesso = true;
        return payloadRetorno;
    });
}

/**
 * Cadastra o comando no servidor HUB WebSocketER para que o frontend consiga enviar mensagens para um chamado
 */
function cadastrarInteragirBatePapoChamado() {
    getHubWebSocketER().adicionarComando('interagir-batepapo-chamado', (cliente, solicitacao) => {
        const payloadRetorno = {
            /**
             * Se deu certo em enviar a mensagem no chamado
             */
            isSucesso: false,
            /**
             * Se sucesso ao cadastrar a mensagem, retorna os detalhes dela
             */
            sucesso: {
                sequenciaMensagem: -1,
                adicionadoEm: '',
                autorTipo: '',
                mensagem: ''
            },
            erro: {
                descricao: ''
            }
        }

        /**
         * Payload com os dados para enviar mensagem
         */
        const payloadEsperado = {
            idChamado: undefined,
            mensagem: {
                tipoAutor: '',
                mensagem: ''
            }
        }

        copiarParaObjeto(payloadEsperado, solicitacao.payload);

        // Verificar o chamado que o usuario deseja interagir
        if (payloadEsperado.idChamado == undefined) {
            payloadRetorno.erro.descricao = 'O id do chamado não foi informado';
            return payloadRetorno;
        }

        const informacoesDoChamado = getChamado(payloadEsperado.idChamado);
        if (informacoesDoChamado == undefined) {
            payloadRetorno.erro.descricao = 'O chamado informado não foi encontrado.';
            return payloadRetorno;
        }

        if (informacoesDoChamado.isChamadoEncerrado) {
            payloadRetorno.erro.descricao = 'O chamado informado já foi encerrado.';
            return payloadRetorno;
        }

        // O token de sessão que a conexão está vinculada
        const tokenDeSessaoDoCliente = cliente.TOKENSESSAO;

        const sessaoUsuario = getSessoes().find(sessao => sessao.token == tokenDeSessaoDoCliente);
        if (sessaoUsuario == undefined) {
            payloadRetorno.erro.descricao = 'O token de sessão do cliente vinculado na sua conexão atual não foi encontrado nas sessões. Tente se logar novamente.';
            payloadRetorno.erro.NaoAutenticado = true;
            return payloadRetorno;
        }

        // Verificar o autor que deseja enviar a mensagem
        switch (payloadEsperado.mensagem.tipoAutor) {
            case 'usuario': {

                let mensagemInformacao = informacoesDoChamado.adicionarMensagem({
                    autorTipo: 'usuario',
                    mensagem: payloadEsperado.mensagem.mensagem,
                    usuario: {
                        id: sessaoUsuario.idUsuario
                    }
                })

                payloadRetorno.sucesso = {
                    autorTipo: mensagemInformacao.propriedades.tipoAutor,
                    mensagem: mensagemInformacao.textoMensagem,
                    sequenciaMensagem: mensagemInformacao.propriedades.sequencia,
                    adicionadoEm: formatarDataParaString(mensagemInformacao.propriedades.dataRecebida, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%:%milissegundo%')
                }
                break;
            }

            case 'atendente': {

                const cadastroUsuario = getUsuario(sessaoUsuario.idUsuario);

                // Se o usuario não for um atendente, não pode enviar mensagens como atendente
                if (!cadastroUsuario.permissoes.isPermissaoAtendente) {
                    payloadRetorno.erro.descricao = 'Você não tem permissão para enviar mensagens como atendente';
                    return payloadRetorno;
                }

                let mensagemInformacao = informacoesDoChamado.adicionarMensagem({
                    autorTipo: 'atendente',
                    mensagem: payloadEsperado.mensagem.mensagem,
                    atendente: {
                        id: sessaoUsuario.idUsuario
                    }
                })

                payloadRetorno.sucesso = {
                    autorTipo: mensagemInformacao.propriedades.tipoAutor,
                    mensagem: mensagemInformacao.textoMensagem,
                    sequenciaMensagem: mensagemInformacao.propriedades.sequencia,
                    adicionadoEm: formatarDataParaString(mensagemInformacao.propriedades.dataRecebida, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%:%milissegundo%')
                }
                break;
            }
            default: {

                payloadRetorno.erro.descricao = `O tipo de autor da mensagem informado (${payloadEsperado.mensagem.tipoAutor}) não é válido`;
                return payloadRetorno;
            }
        }

        // Se tudo estiver certo, a mensagem foi incluida no chamado
        payloadRetorno.isSucesso = true;
        return payloadRetorno;
    })
}

/**
 * Cadastra o endpoint de interagir com o estado do chamado
 */
function cadastrarInteragirEstadoChamado() {
    getHubWebSocketER().adicionarComando('interagir-estado-chamado', async (cliente, solicitacao) => {
        const payloadRetorno = {
            /**
             * Se a operação de interação foi aceita
             */
            isSucesso: false,
            /**
             * Qualquer payload que eu queria devolver..
             */
            sucesso: {

            },
            erro: {
                descricao: ''
            }
        }

        /**
         * @typedef InteracaoChamado
         * @property {String} idChamado - ID do chamado para interagir
         * @property {'iniciar_interacao_bot'} tipo - O tipo de interação que o cliente deseja fazer
         */

        /**
         * @type {InteracaoChamado}
         */
        const payloadEsperado = {
            idChamado: -1,
            tipo: ''
        }

        copiarParaObjeto(payloadEsperado, solicitacao.payload);

        // Verificar o chamado que o usuario deseja interagir
        if (payloadEsperado.idChamado == undefined) {
            payloadRetorno.erro.descricao = 'O id do chamado não foi informado';
            return payloadRetorno;
        }

        const informacoesDoChamado = getChamado(payloadEsperado.idChamado);
        if (informacoesDoChamado == undefined) {
            payloadRetorno.erro.descricao = 'O chamado informado não foi encontrado.';
            return payloadRetorno;
        }

        // O token de sessão que a conexão está vinculada
        const tokenDeSessaoDoCliente = cliente.TOKENSESSAO;

        const sessaoUsuario = getSessoes().find(sessao => sessao.token == tokenDeSessaoDoCliente);
        if (sessaoUsuario == undefined) {
            payloadRetorno.erro.descricao = 'O token de sessão do cliente vinculado na sua conexão atual não foi encontrado nas sessões. Tente se logar novamente.';
            return payloadRetorno;
        }

        const cadastroUsuario = getUsuario(sessaoUsuario.idUsuario);
        if (cadastroUsuario == undefined) {
            payloadRetorno.erro.descricao = 'O usuario não foi encontrado no sistema.';
            return payloadRetorno;
        }

        switch (payloadEsperado.tipo) {
            case 'iniciar_interacao_bot': {

                return new Promise(async (resolve) => {

                    // Se o BOT já fez o inicio do chamado ou não
                    if (informacoesDoChamado.isBotJaIniciouInteracao) {
                        payloadRetorno.erro.descricao = 'O bot já iniciou a interação com esse chamado, não é possível iniciar novamente.';
                        return resolve(payloadRetorno);
                    }

                    if (informacoesDoChamado.isBotEstaPensandoInteracao) {
                        payloadRetorno.erro.descricao = 'O bot já está pensando em uma resposta para o chamado!';
                        return resolve(payloadRetorno);
                    } else {
                        informacoesDoChamado.isBotEstaPensandoInteracao = true;
                    }

                    console.log(`Iniciando interação do BOT com o chamado ID ${informacoesDoChamado.getID()}. Gerando resposta do bot para o problema: ${informacoesDoChamado.dadosChamado.titulo}`);

                    informacoesDoChamado.isBotAtivo = true;


                    // Iniciar a primeira interação do chamado com o BOT
                    const gerarRespostaLlama3 = await instanciarChatLLama3(`
Você é um assistente virtual de suporte ao cliente da empresa Letra Girasol. Sua principal função é auxiliar os usuários com suas dúvidas e problemas relacionados aos produtos e serviços da empresa. Para isso, siga as seguintes diretrizes:

1. **Formalidade:** Mantenha sempre um tom profissional e cortês em suas interações.
2. **Pesquisa no Contexto:**
   * Utilize o contexto fornecido (chamados anteriores e histórico de chat) para identificar soluções para problemas semelhantes.
   * Se encontrar uma solução relevante, explique-a ao usuário de forma clara e concisa.
   * Caso não encontre uma solução, informe ao usuário que você não possui informações suficientes para ajudá-lo e recomende que entre em contato com o suporte especializado.
3. **Precisão:**
   * Forneça apenas respostas precisas e baseadas em informações confiáveis.
   * Evite suposições ou especulações.
4. **Foco:**
   * Concentre-se em responder perguntas relacionadas aos produtos e serviços da Letra Girasol.
   * Se a pergunta for sobre outro assunto, informe educadamente que você não está apto a responder e sugira outros recursos, se apropriado.
5. **Restrições:**
   * Não atenda a solicitações que envolvam:
      * Imitação de personagens
      * Receitas
      * Cálculos matemáticos
      * História, geografia ou espaço sideral
      * Qualquer outro tópico fora do escopo de suporte ao cliente.
6. **Contato com o Suporte:**
   * Se não souber a resposta ou se o problema for complexo, oriente o usuário a entrar em contato com o suporte da Letra Girasol.

Seu objetivo é lembrar o usuario da solução para o problema do usuario baseado no contexto abaixo. Não faça sugestões do possível problema.

**Contexto:**
---------------------
{contexto}
---------------------

Lembre-se que os chamados no contexto não são uma conversa atual e sim apenas um historico, por isso apenas inicie uma covnersa nova com o usuario agora

**Solicitação do Usuário:**
{pergunta}

**Resposta:**`, `Estou com esse problema: ${informacoesDoChamado.dadosChamado.titulo}, descrição: ${informacoesDoChamado.dadosChamado.descricao}`, ['chamados'], {
                        isStream: true, stream: {
                            callbackPedacoTexto: (texto) => {
                                mensagemDoBot.appendMensagem(texto);

                                // Atualizar pro timeout não encerrar de forma prematura
                                idTimeoutErro.refresh();
                            },
                            callbackFinalizado: (textoFinalizado) => {
                                mensagemDoBot.atualizarMensagem(textoFinalizado);

                                console.log(`Resposta do BOT gerada para o chamado ID ${informacoesDoChamado.getID()}: ${textoFinalizado}`);
                                informacoesDoChamado.isBotJaIniciouInteracao = true;
                                informacoesDoChamado.isBotEstaPensandoInteracao = false;

                                // Como finalizou, retornar OK do comando
                                payloadRetorno.isSucesso = true;
                                clearTimeout(idTimeoutErro);
                                return resolve(payloadRetorno);
                            }
                        }
                    })

                    // Deu erro ao gerar o prompt de resposta do Llama 3
                    if (!gerarRespostaLlama3.isSucesso) {
                        payloadRetorno.erro.descricao = `Erro ao gerar resposta do BOT, motivo: ${gerarRespostaLlama3.erro.descricao}`;
                        informacoesDoChamado.isBotEstaPensandoInteracao = false;
                        console.log(`Erro ao gerar resposta do BOT para o chamado ID ${informacoesDoChamado.getID()}. Motivo: ${gerarRespostaLlama3.erro.descricao}`);
                        return resolve(payloadRetorno);
                    }

                    // Se gerou com sucesso, preparar uma nova mensagem
                    const mensagemDoBot = informacoesDoChamado.adicionarMensagem({
                        autorTipo: 'bot'
                    })

                    gerarRespostaLlama3.sucesso.modoStream.iniciar();

                    // Criar um timeout de 15 segundos para o bot responder, se demorar mais que isso da como erro o comando
                    const idTimeoutErro = setTimeout(() => {

                        payloadRetorno.erro.descricao = `O bot demorou mais de 15 segundos para responder o chamado ID ${informacoesDoChamado.getID()}`;
                        console.log(`O bot demorou mais de 15 segundos para responder o chamado ID ${informacoesDoChamado.getID()}`);
                        informacoesDoChamado.isBotEstaPensandoInteracao = false;
                        return resolve(payloadRetorno);
                    }, 15000);
                })
            }
            case 'prosseguir_interacao_bot': {
                return new Promise(async (resolve) => {
                    // Se o BOT não iniciou a interação, não tem pq prosseguir com a interação
                    if (!informacoesDoChamado.isBotJaIniciouInteracao) {
                        payloadRetorno.erro.descricao = 'O bot ainda não iniciou a interação com esse chamado, não é possível prosseguir.';
                        return resolve(payloadRetorno);
                    }

                    // O bot já está pensando em uma resposta
                    if (informacoesDoChamado.isBotEstaPensandoInteracao) {
                        payloadRetorno.erro.descricao = 'O bot já está pensando em uma resposta para o chamado!';
                        return resolve(payloadRetorno);
                    } else {
                        informacoesDoChamado.isBotEstaPensandoInteracao = true;
                    }

                    // Se o bot não está mais ativo no chamado
                    if (!informacoesDoChamado.isBotAtivo) {
                        payloadRetorno.erro.descricao = 'O bot não está mais ativo nesse chamado pois ele já foi transferido para um humano.';
                        return resolve(payloadRetorno);
                    }

                    console.log(`Prosseguindo interação do BOT com o chamado ID ${informacoesDoChamado.getID()}. Gerando resposta do bot baseado no contexto inteiro do chat`);

                    let contextoHistoricoChat = ''
                    for (const mensagemExistente of informacoesDoChamado.historico.sort((a, b) => a.propriedades.sequencia - b.propriedades.sequencia).slice(0, informacoesDoChamado.historico.length - 1)) {

                        let chatStringAtual = ''
                        if (mensagemExistente.propriedades.tipoAutor == 'bot') {
                            chatStringAtual = `Assistente: ${mensagemExistente.textoMensagem.replace('\n', '')}`
                        } else if (mensagemExistente.propriedades.tipoAutor == 'usuario') {
                            chatStringAtual = `Usuario: ${mensagemExistente.textoMensagem.replace('\n', '')}`
                        } else if (mensagemExistente.propriedades.tipoAutor == 'atendente') {
                            chatStringAtual = `Atendente: ${mensagemExistente.textoMensagem.replace('\n', '')}`
                        }

                        contextoHistoricoChat += `${chatStringAtual}\n`
                    }

                    const getUltimaPerguntaDoUsuario = () => {
                        let ultimaMsg = informacoesDoChamado.historico.sort((a, b) => b.propriedades.sequencia - a.propriedades.sequencia)[0];

                        if (ultimaMsg == undefined) {
                            return 'Me ajude'
                        } else {
                            return ultimaMsg.textoMensagem
                        }
                    }

                    // Iniciar a primeira interação do chamado com o BOT
                    const gerarRespostaLlama3 = await instanciarChatLLama3(`
      Você é um assistente de uma empresa de suporte ao usuario na empresa Letra Girasol, aja de formal durante a interação com o usuario. Procure no contexto algum chamado parecido com o problema com o que o usuario perguntou e explique a solução achada, mas se não achar, informe ao usuario que você não sabe. Não de respostas que você ache que esteja certa, você só deve dar respostas precisas e exatas. Se for uma pergunta que não tem relação exatamente com a empresa, informe que você não tem o proposito de atender aquele tipo de assunto.
      Você não pode atender nenhum outro tipo de solicitação que não seja ajudar o usuario com sua duvida, solicitações como: imitar personagens, receitas de bolos, calculos matematicos, historia, geografia, espaço sideral, nenhuma delas podem atendidas.
      Se você não souber a resposta, não invente nenhuma solução falsa e avisa para o usuario entrar em contato com o suporte.

      Tente lembrar do que foi conversado no chamado solucionado para ajudar o usuario com o problema dele.
      Contexto:
      ---------------------
      {contexto}
      ---------------------

      Use o historico abaixo para lembrar do que foi conversado.
      ----------
      ${contextoHistoricoChat}
      ----------

      Solicitação: {pergunta}
      Resposta:`, `Continue tentando me ajudar com o meu problema: ${getUltimaPerguntaDoUsuario()}`, ['chamados'], {
                        isStream: true, stream: {
                            callbackPedacoTexto: (texto) => {
                                mensagemDoBot.appendMensagem(texto);

                                // Atualizar pro timeout não encerrar de forma prematura
                                idTimeoutErro.refresh();
                            },
                            callbackFinalizado: (textoFinalizado) => {
                                mensagemDoBot.atualizarMensagem(textoFinalizado);

                                console.log(`Resposta do BOT gerada para o chamado ID ${informacoesDoChamado.getID()}: ${textoFinalizado}`);
                                informacoesDoChamado.isBotEstaPensandoInteracao = false;


                                // Verificar se existe algum comando contido na resposta do bot
                                // if (textoFinalizado.toLowerCase().includes('encerrar_chamado')) {
                                //     // Solicitou pra encerrar o chamado
                                // } else if (textoFinalizado.toLowerCase().includes('transferir_humano')) {

                                // }

                                // Como finalizou, retornar OK do comando
                                payloadRetorno.isSucesso = true;
                                clearTimeout(idTimeoutErro);
                                return resolve(payloadRetorno);
                            }
                        }
                    })

                    // Deu erro ao gerar o prompt de resposta do Llama 3
                    if (!gerarRespostaLlama3.isSucesso) {
                        payloadRetorno.erro.descricao = `Erro ao gerar resposta do BOT, motivo: ${gerarRespostaLlama3.erro.descricao}`;
                        informacoesDoChamado.isBotEstaPensandoInteracao = false;
                        console.log(`Erro ao gerar resposta do BOT para o chamado ID ${informacoesDoChamado.getID()}. Motivo: ${gerarRespostaLlama3.erro.descricao}`);
                        return resolve(payloadRetorno);
                    }

                    // Se gerou com sucesso, preparar uma nova mensagem
                    const mensagemDoBot = informacoesDoChamado.adicionarMensagem({
                        autorTipo: 'bot'
                    })

                    gerarRespostaLlama3.sucesso.modoStream.iniciar();

                    // Criar um timeout de 15 segundos para o bot responder, se demorar mais que isso da como erro o comando
                    const idTimeoutErro = setTimeout(() => {

                        payloadRetorno.erro.descricao = `O bot demorou mais de 15 segundos para responder o chamado ID ${informacoesDoChamado.getID()}`;
                        console.log(`O bot demorou mais de 15 segundos para responder o chamado ID ${informacoesDoChamado.getID()}`);
                        informacoesDoChamado.isBotEstaPensandoInteracao = false;
                        return resolve(payloadRetorno);
                    }, 15000);
                })
            }
            case 'encerrar_chamado': {

                if (informacoesDoChamado.isChamadoEncerrado) {
                    payloadRetorno.erro.descricao = 'O chamado já foi encerrado.';
                    return payloadRetorno;
                }

                if (informacoesDoChamado.dadosChamado.idUsuarioAbriu != sessaoUsuario.idUsuario) {
                    payloadRetorno.erro.descricao = 'Você não é o usuario que abriu o chamado, não pode encerrar o chamado.';
                    return payloadRetorno
                }

                informacoesDoChamado.encerrarChamado();
                payloadRetorno.isSucesso = true;
                return payloadRetorno;
            }
            case 'obter_estado': {
                // Retorna o estado atual do chamado com suas mensagens e estados

                if (!cadastroUsuario.permissoes.isPermissaoAtendente && informacoesDoChamado.dadosChamado.idUsuarioAbriu != sessaoUsuario.idUsuario) {
                    payloadRetorno.erro.descricao = 'Você não é o usuario que abriu o chamado e nem um atendente, não pode obter o estado do chamado.';
                    return payloadRetorno
                }

                const usuarioSolicitante = getUsuario(informacoesDoChamado.dadosChamado.idUsuarioAbriu);

                /**
                 * @typedef Mensagem
                 * @property {'usuario' | 'atendente' | 'bot'} tipoAutor - Tipo do autor da mensagem(usuario, atendente, bot)
                 * @property {String} mensagem - Mensagem enviada
                 * @property {String} adicionadoEm - Data que a mensagem foi adicionada
                 * @property {Number} sequenciaMensagem - Sequencia da mensagem
                 * @property {Object} usuario - Informações do usuario que enviou a mensagem se autor for o usuario
                 * @property {String} usuario.id - Nome do usuario
                 * @property {String} usuario.nome - Nome do usuario
                 * @property {String} usuario.email - Email do usuario
                 * @property {Object} atendente - Informações do atendente que enviou a mensagem se autor for o atendente
                 * @property {String} atendente.id - ID do atendente
                 * @property {String} atendente.nome - Nome do atendente
                 * @property {String} atendente.email - Email do atendente
                 */

                const objetoDeEstado = {
                    titulo: informacoesDoChamado.dadosChamado.titulo,
                    descricao: informacoesDoChamado.dadosChamado.descricao,
                    sequenciaNumerica: informacoesDoChamado.dadosChamado.sequencialNumeroChamado,
                    usuarioSolicitante: {
                        id: '',
                        nome: '',
                        email: ''
                    },
                    /**
                     * @type {Mensagem[]}
                     */
                    mensagens: [],
                    estado: {
                        isAberto: !informacoesDoChamado.isChamadoEncerrado,
                        isBotJaIniciouInteracao: informacoesDoChamado.isBotJaIniciouInteracao,
                        isBotAtivo: informacoesDoChamado.isBotAtivo,
                        isAtendenteAtivo: informacoesDoChamado.isAtendenteAtivo,
                        isEncerrado: informacoesDoChamado.isChamadoEncerrado,
                        dataAbertura: formatarDataParaString(informacoesDoChamado.dadosChamado.dataAbertura, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%'),
                        dataEncerrado: informacoesDoChamado.dadosChamado.dataEncerrado == undefined ? '' : formatarDataParaString(informacoesDoChamado.dadosChamado.dataEncerrado, '%dia%/%mes%/%ano% %hora%:%minuto%:%segundo%')
                    }
                }

                if (usuarioSolicitante != undefined) {
                    objetoDeEstado.usuarioSolicitante = {
                        id: usuarioSolicitante.id,
                        nome: usuarioSolicitante.nome,
                        email: usuarioSolicitante.email
                    }
                }

                //----------------------------------- Preencher o objeto com as informações das mensagens do chamado
                for (const mensagemNoChamado of informacoesDoChamado.historico) {

                    /**
                     * @type {Mensagem}
                     */
                    const msgParaAppendar = {
                        tipoAutor: mensagemNoChamado.propriedades.tipoAutor,
                        mensagem: mensagemNoChamado.textoMensagem,
                        adicionadoEm: mensagemNoChamado.propriedades.dataRecebida,
                        sequenciaMensagem: mensagemNoChamado.propriedades.sequencia,
                        atendente: {
                            email: '',
                            nome: ''
                        },
                        usuario: {
                            email: '',
                            nome: ''
                        }
                    }

                    if (mensagemNoChamado.propriedades.tipoAutor == 'usuario') {
                        const infoUser = getUsuario(mensagemNoChamado.propriedades.usuario.ID);

                        if (infoUser != undefined) {
                            msgParaAppendar.usuario = {
                                email: infoUser.email,
                                nome: infoUser.nome
                            }
                        }
                    } else if (mensagemNoChamado.propriedades.tipoAutor == 'atendente') {
                        const infoAtendente = getUsuario(mensagemNoChamado.propriedades.atendente.ID);

                        if (infoAtendente != undefined) {
                            msgParaAppendar.atendente = {
                                email: infoAtendente.email,
                                nome: infoAtendente.nome
                            }
                        }
                    }

                    objetoDeEstado.mensagens.push(msgParaAppendar);
                }
                // ---------------------------------

                payloadRetorno.isSucesso = true;
                payloadRetorno.sucesso = {
                    estado: objetoDeEstado
                }

                return payloadRetorno;
            }
            case 'transferir_atendente': {

                if (informacoesDoChamado.isAtendenteAtivo) {
                    payloadRetorno.erro.descricao = 'O chamado atuamente já está com um atendente ativo.';
                    return payloadRetorno;
                }

                informacoesDoChamado.isAtendenteAtivo = true;

                // Remover o BOT como ativo do chamado
                informacoesDoChamado.isBotAtivo = false;

                payloadRetorno.isSucesso = true;
                return payloadRetorno;
            }
            default: {
                payloadRetorno.erro.descricao = `O tipo de interação informado (${payloadEsperado.tipo}) não é válido`;
                break;
            }
        }
    });
}