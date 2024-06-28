import { StoreGlobal } from "../stores/StoreGlobal.js"

/**
 * Pausa a execução do código por um determinado ms
 * @param {Number} ms - O número de ms para pausar
 * @returns Uma promise que resolve após o tempo especificado
 */
export function pausar(ms) {
    if (StoreGlobal().dev.semDelayEmTudo) {
        ms = 500;
    }
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}