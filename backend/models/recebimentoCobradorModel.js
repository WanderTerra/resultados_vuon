/**
 * RecebimentoCobradorModel
 *
 * Este model estava sendo requerido por `comparativoModel.js`, mas o arquivo não existia,
 * impedindo o backend de iniciar.
 *
 * Implementação mínima para o backend subir. Se você quiser, depois implementamos a query
 * real para listar agentes (cobradores) a partir da tabela correta.
 */

class RecebimentoCobradorModel {
    static async getAgentesList() {
        // Retorno “neutro” para não quebrar as telas.
        return [];
    }
}

module.exports = RecebimentoCobradorModel;


