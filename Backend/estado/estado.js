
import { iniciarHub } from "./hubWebSocket/HubWebSocket.js";
/**
 * Realizar o inicio do estado
 */
export function iniciarEstado() {
    console.log(`Realizando o inicio do estado...`);
    iniciarHub();
}