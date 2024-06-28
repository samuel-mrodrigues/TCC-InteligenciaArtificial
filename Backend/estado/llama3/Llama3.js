/**
 * O estado do LLama 3 para comunicação com a IA
 */

import { Document, VectorStoreIndex, Ollama, Settings, HuggingFaceEmbedding, ResponseSynthesizer, CompactAndRefine, QueryEngineTool, FunctionTool, ReActAgent } from "llamaindex"
import { getChamados } from "../chamados/chamados.js";
import OllamaInstancia from "ollama"
import { query } from "express";
import { env } from "process";


/**
 * @typedef BaseDeDados
 * @property {Document} documento - Documentos preparados para serem vetorizados
 * @property {String} id - ID customizado para especificar futuramente ao modelo qual base de dados utilizar
 */

/**
 * Base de dados que podem ser mencionados para o Llama 3 utilizar em seus prompts
 * @type {BaseDeDados[]}
 */
const baseDeDados = []

let isStartado = false;

/**
 * Vetor onde todos os dados são salvos
 */
// const dadosVetorizados = await VectorStoreIndex.init();

/**
 * Realizar o inicio do Llama 3
 */
export function iniciar() {
    log('Iniciando Llama 3')

    Settings.embedModel = new HuggingFaceEmbedding({
        modelType: "BAAI/bge-large-en-v1.5",
        quantized: false,
    })

    const instanciaOllama = new Ollama({
        model: 'llama3'
    })
    Settings.llm = instanciaOllama

    isStartado = true;
}

/**
 * Atualizar(e adicionar se não existir) uma nova base de dados com informações
 * @param {String} identificacaoBase - Identificação da base de dados para referenciar ao LLama 3 em outro momento
 * @param {String} texto - Texto que será utilizado para vetorizar e adicionar a base de dados
 */
export async function adicionarBaseDeDados(identificacaoBase, texto, metadata) {
    if (!isStartado) {
        iniciar();
    }

    // Verificar se já existe uma base de dados com o mesmo nome
    let baseDadosExistente = baseDeDados.find(base => base.id == identificacaoBase);
    if (baseDadosExistente == undefined) {

        /**
         * @type {BaseDeDados}
        */
        baseDadosExistente = {
            documento: new Document({ text: '', id_: identificacaoBase }),
            id: identificacaoBase
        }

        baseDeDados.push(baseDadosExistente);
    }

    log(`Adicionando texto a base de dados ${identificacaoBase}`)
    baseDadosExistente.documento = new Document({ text: `${texto}`, id_: `${identificacaoBase}`, metadata: metadata });
    return baseDadosExistente;
}

/**
 * Remover toda a base de dados ou uma em específico
 * @param {String} nome 
 */
export async function zerarBaseDeDados(nome) {
    if (nome == undefined) {
        baseDeDados = [];
        log(`Todas as bases de dados foram removidas`)
    } else {
        baseDeDados = baseDeDados.filter(base => base.id != nome);
        log(`Base de dados ${nome} removida`)
    }
}


/**
 * @callback StreamCallbackNovoTexto
 * @param {String} texto - Pedaço de texto enviado
 */

/**
 * @callback StreamCallbackFinalizado
 * @param {String} texto - Texto finalizado completo da resposta
 */

/**
 * Enviar um prompt para o Llama 3 processar. (Nenhuma informação de historico de chat, contexto e base de dados é armazenada, a não ser aquelas explicitamentes passadas na função)
 * @param {String} promptSistema - Template do prompt para configurar o comportamento da resposta que a LLama 3 irá gerar. Utilize a variavel {contexto} para referenciar o contexto procurado pelas bases de dados e {perguta} para referenciar a pergunta no prompt
 * @param {String} pergunta - Pergunta que será feita ao Llama 3
 * @param {String[]} basesDeDados - Opcionalmente informar as bases de dados que podem ser utilizadas para dar informações ao Llama 3
 * @param {Object} propriedades - Algumas opções opcionais para passar ao Llama
 * @param {Boolean} propriedades.isStream - Se a resposta deve ser enviada aos poucos ou aguardar completamente a resposta do modelo.
 * @param {Object} propriedades.stream - Se stream estiver true, configure o comportamento dela
 * @param {StreamCallbackNovoTexto} propriedades.stream.callbackPedacoTexto - Função que será chamada a cada novo pedaço de texto enviado pelo modelo
 * @param {StreamCallbackFinalizado} propriedades.stream.callbackFinalizado - Função que será chamada quando o modelo finalizar a resposta completa
 */
export async function executarPromptLlama3(promptSistema, pergunta, basesDeDadosParaUtilizar, propriedades) {
    if (!isStartado) {
        iniciar();
    }

    const retornoPrompt = {
        /**
         * Se o prompt foi iniciado com sucesso
         */
        isSucesso: false,
        sucesso: {
            modoStream: {
                /**
                 * Iniciar a stream de resposta(o modelo fica em aguardo até você instanciar)
                 */
                iniciar: () => {

                }
            },
            /**
             * Se o modo stream estiver false, contém a resposta completa do modelo
             */
            modoAguardar: {
                resposta: ''
            }
        },
        erro: {
            descricao: ''
        }
    }

    // Vetor de informações que será utilizado opcionalmente por busca de informações
    const novoVetorDeDados = await VectorStoreIndex.fromDocuments([new Document({ text: '', id_: '' })]);

    log('Iniciando vetorização de dados para o Llama 3 para um novo prompt')

    if (basesDeDadosParaUtilizar != undefined && Array.isArray(basesDeDadosParaUtilizar)) {

        // Adicionar as bases adicionais de conhecimento
        for (const baseNome of basesDeDadosParaUtilizar) {

            // Verificar se a base de dados existe
            const documentoDados = baseDeDados.find(base => base.id == baseNome);
            if (documentoDados != undefined) {
                log(`Adicionando base de dados (${baseNome}) ao vetor de dados.`);
                await novoVetorDeDados.insert(documentoDados.documento);
            }
        }
    }

    const funcaoPromptSolicitado = ({ context, query }) => {
        let copiaPrompt = promptSistema;
        copiaPrompt = copiaPrompt.replace('{contexto}', context).replace('{pergunta}', query);

        return copiaPrompt;
    };

    // let toolTeste = QueryEngineTool.


    const gerarResposta = new ResponseSynthesizer({
        responseBuilder: new CompactAndRefine(undefined, funcaoPromptSolicitado)
    });


    const geradorDePergunta = novoVetorDeDados.asQueryEngine({ responseSynthesizer: gerarResposta, similarityTopK: 20 });

    retornoPrompt.isSucesso = true;

    // Se for modo stream
    if (propriedades != undefined && propriedades.isStream) {

        retornoPrompt.sucesso.modoStream.iniciar = async () => {
            log('Iniciando stream de resposta do Llama 3')

            log(`Iniciando prompt de resposta via stream do Llama 3 com a pergunta: ${pergunta}`)
            const streamPedacos = await geradorDePergunta.query({ query: pergunta, stream: true })

            let textoCompleto = ``;
            for await (const token of streamPedacos) {
                if (propriedades.stream != undefined && propriedades.stream.callbackPedacoTexto != undefined) {
                    propriedades.stream.callbackPedacoTexto(token.response)
                    textoCompleto += token.response;
                }
            }

            if (propriedades.stream != undefined && propriedades.stream.callbackFinalizado != undefined) {
                propriedades.stream.callbackFinalizado(textoCompleto)
            }
        }
    } else {
        log(`Iniciando prompt de resposta do Llama 3 com a pergunta: ${pergunta}`)

        // Se for o modo normal
        const aguardarResposta = await geradorDePergunta.query({ query: pergunta });

        retornoPrompt.sucesso.modoAguardar.resposta = aguardarResposta.response;
    }

    return retornoPrompt;
}

/**
 * Instancair um novo chat do LLama pra achar resoluções em chamados
 */
export async function instanciarChatLLama3(promptSistema, perguntaUsuario, basesDeDadosParaUtilizar, propriedades) {

    if (!isStartado) {
        iniciar();
    }

    const retornoPrompt = {
        /**
         * Se o prompt foi iniciado com sucesso
         */
        isSucesso: false,
        sucesso: {
            modoStream: {
                /**
                 * Iniciar a stream de resposta(o modelo fica em aguardo até você instanciar)
                 */
                iniciar: () => {

                }
            },
            /**
             * Se o modo stream estiver false, contém a resposta completa do modelo
             */
            modoAguardar: {
                resposta: ''
            }
        },
        erro: {
            descricao: ''
        }
    }

    if (basesDeDadosParaUtilizar == 'chamados') {
        basesDeDadosParaUtilizar = [];
        baseDeDados.forEach(baseObj => basesDeDadosParaUtilizar.push(baseObj.id))
    }

    // Vetor de informações que será utilizado opcionalmente por busca de informações
    const novoVetorDeDados = await VectorStoreIndex.fromDocuments([new Document({ text: 'n', id_: '' })]);


    log('Iniciando vetorização de dados para o Llama 3 para um novo prompt')

    if (basesDeDadosParaUtilizar != undefined && Array.isArray(basesDeDadosParaUtilizar)) {

        // Adicionar as bases adicionais de conhecimento
        for (const baseNome of basesDeDadosParaUtilizar) {

            // Verificar se a base de dados existe
            const documentoDados = baseDeDados.find(base => base.id == baseNome);
            if (documentoDados != undefined) {
                log(`Adicionando base de dados (${baseNome}) ao vetor de dados.`);
                await novoVetorDeDados.insert(documentoDados.documento);
            }
        }
    }

    const funcaoPromptSolicitado = ({ context, query }) => {
        let copiaPrompt = promptSistema;
        copiaPrompt = copiaPrompt.replace('{contexto}', context).replace('{pergunta}', query);

        return copiaPrompt;
    };

    // let toolTeste = QueryEngineTool.


    const gerarResposta = new ResponseSynthesizer({
        responseBuilder: new CompactAndRefine(undefined, funcaoPromptSolicitado)
    });


    const geradorDePergunta = novoVetorDeDados.asQueryEngine({ responseSynthesizer: gerarResposta });

    retornoPrompt.isSucesso = true;

    // Se for modo stream
    if (propriedades != undefined && propriedades.isStream) {

        retornoPrompt.sucesso.modoStream.iniciar = async () => {
            log('Iniciando stream de resposta do Llama 3')

            log(`Iniciando prompt de resposta via stream do Llama 3 com a pergunta: ${perguntaUsuario}`)
            const streamPedacos = await geradorDePergunta.query({ query: perguntaUsuario, stream: true })

            // -------------
            try {
                const respostaOi = await OllamaInstancia.chat({
                    model: 'llama3',
                    messages: [{ role: 'user', content: 'Me gere um texto de 400 palavras sobre uma historia de fada.' }]
                })
                console.log(respostaOi);
            } catch (ex) {
                console.log(ex);
            }
            // ---------

            let textoCompleto = ``;
            for await (const token of streamPedacos) {
                if (propriedades.stream != undefined && propriedades.stream.callbackPedacoTexto != undefined) {
                    propriedades.stream.callbackPedacoTexto(token.response)
                    textoCompleto += token.response;
                }
            }

            if (propriedades.stream != undefined && propriedades.stream.callbackFinalizado != undefined) {
                propriedades.stream.callbackFinalizado(textoCompleto)
            }
        }
    } else {
        log(`Iniciando prompt de resposta do Llama 3 com a pergunta: ${perguntaUsuario}`)

        // Se for o modo normal
        const aguardarResposta = await geradorDePergunta.query({ query: perguntaUsuario });

        retornoPrompt.sucesso.modoAguardar.resposta = aguardarResposta.response;
    }

    return retornoPrompt;
}

function log(msg) {
    let conteudoMsg = ''
    if (typeof msg == 'object') {
        conteudoMsg = JSON.stringify(msg, null, 4);
    } else {
        conteudoMsg = msg;
    }

    console.log(`[Llama 3]: ${conteudoMsg}`)
}