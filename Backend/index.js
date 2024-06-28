import express from "express"
import { cadastrar as cadastrarEndpoints } from "./endpoints/endpoints.js"
import { RequisicaoExpress } from "./utils/RequisicaoExpress.js"
import { iniciarEstado } from "./estado/estado.js"
import { executarPromptLlama3, iniciar as iniciarLlama3, adicionarBaseDeDados, instanciarChatLLama3 } from "./estado/llama3/Llama3.js";


// Instancia Express
const instanciaExpress = express();


/**
 * Fazer todo o inicio do backend
 */
async function iniciarBackend() {
    console.log(`Iniciando o backend...`);

    instanciaExpress.use(tratarOPTIONS)
    instanciaExpress.use(tratarCorpoRequisicao);

    cadastrarEndpoints();

    iniciarEstado();

    instanciaExpress.use(tratarEndpointInvalido)

    iniciarLlama3();

    instanciaExpress.listen(3009, () => {
        console.log(`Backend iniciado na porta 3009`);
    })
}

/**
 * Se for solicitado algum endpoint que não existe
 */
function tratarEndpointInvalido(req, resp, next) {
    const novaResposta = new RequisicaoExpress(req, resp);

    novaResposta.recusar("endpoint-invalido", `O endpoint solicitado ${novaResposta.parametros.requisicaoOriginal.requisicao.method} -> (${req.url}) não existe.`).devolverResposta();
}

/**
 * Tratar o recebimento de solicitações OPTIONS
 */
function tratarOPTIONS(req, res, next) {

    // Seto os headers para permitir as requisições de qualquer origem
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Authorization');
    // res.setHeader('Access-Control-Allow-Credentials', true);

    // Se for uma request do tipo OPTIONS, envio os headers e finalizado a verificação
    if (req.method == "OPTIONS") {
        res.sendStatus("200")
        return;
    } else {
        next();
    }
}

/**
 * Dar parse no body da requisição e adicionar um BODY com o objeto JSON recebido
 */
function tratarCorpoRequisicao(req, resp, next) {

    req.BODY = {}
    let conteudoCorpo = req.headers["content-length"];
    // Verifica se a requisição tem algum payload para carregar
    if (conteudoCorpo != undefined && conteudoCorpo != 0) {

        // Guardar as strings recebidas no POST
        let dataRecebida = '';

        // Recebe todo o conteudo do payload do POST e inclui na dataRecebida
        req.on("data", (data) => {
            dataRecebida += data;
        })

        // Quando todo o payload tiver sido enviado, tentar dar parse pra validar se pode continuar ou não
        req.on("end", () => {
            try {
                req.BODY = JSON.parse(dataRecebida);
                // Se não der erros, a requisição terá os dados do POST e as rotas terão acesso ao conteudo enviado pelo usuario

                next();
            } catch (ex) {
                // Se der erros, notificar o usuario que o payload dele é inválido
                console.log(`Não foi possível converter o payload do POST em JSON da requisição recebida. Motivo: ${ex.message}. Mensagem recebida: ${dataRecebida}`)

                resp.statusCode = '500';
                resp.send("A sua solicitação POST enviou um corpo que não pode ser convertido para JSON. Sua solicitação será recusada.");
                resp.end();
                return;
            }
        })
    } else {
        // Caso não tenha, apenas ignorar e seguir para os proximos endpoints
        next()
    }
}

iniciarBackend();

/**
 * Retorna a instancia do express
 */
export function getInstanciaExpress() {
    return instanciaExpress;
}

/**
 * @callback CallbackOnRequisicaoRecebida
 * @param {RequisicaoExpress} requisicao - Dados da requisição recebida
 */

/**
 * Adiciona um endpoint do tipo POST
 * @param {String} endpoint - O endpoint desejado para cadastra o POST
 * @param {CallbackOnRequisicaoRecebida} callback - Função a ser chamada quando a requisição for recebida
 */
export function addPOST(endpoint, callback) {
    instanciaExpress.post(endpoint, async (req, resp) => {
        const novaRequisicao = new RequisicaoExpress(req, resp);
        try {
            await callback(novaRequisicao);
        } catch (ex) {
            console.log(`Erro ao processar requisição POST ${novaRequisicao.uuid} em ${endpoint}. Motivo: ${ex.message}`);
            novaRequisicao.recusar(`Erro interno ao processar a requisição. Stacktrace: ${ex.message}`).devolverResposta();
        }
    })
}

/**
 * Adiciona um endpoint do tipo GET
 * @param {String} endpoint - O endpoint desejado para cadastra o GET
 * @param {CallbackOnRequisicaoRecebida} callback - Função a ser chamada quando a requisição for recebida
 */
export function addGET(endpoint, callback) {
    instanciaExpress.get(endpoint, async (req, resp) => {
        const novaRequisicao = new RequisicaoExpress(req, resp);
        try {
            await callback(novaRequisicao);
        } catch (ex) {
            console.log(`Erro ao processar requisição GET ${novaRequisicao.uuid} em ${endpoint}. Motivo: ${ex.message}`);
            novaRequisicao.recusar(`Erro interno ao processar a requisição. Stacktrace: ${ex.message}`).devolverResposta();
        }
    })
}

/**
 * Formata uma data de acordo com a máscara fornecida
 * @param {Date} data - Objeto Date a ser formatado
 * @param {string} mascara - Máscara de formatação da data
 * @returns {string} - Data formatada
 */
export function formatarDataParaString(data, mascara) {
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear().toString();

    let dataFormatada = mascara.replace('%dia%', dia);
    dataFormatada = dataFormatada.replace('%mes%', mes);
    dataFormatada = dataFormatada.replace('%ano%', ano);
    dataFormatada = dataFormatada.replace('%hora%', data.getHours().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%minuto%', data.getMinutes().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%segundo%', data.getSeconds().toString().padStart(2, '0'));
    dataFormatada = dataFormatada.replace('%millisegundo%', data.getMilliseconds().toString().padStart(3, '0'));

    return dataFormatada;
}
