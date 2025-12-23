/**
 * Controller de Produtividade do Agente
 *
 * OBS: este controller estava sendo referenciado nas rotas, mas o arquivo não existia,
 * causando crash do backend no boot.
 *
 * Por enquanto retornamos payloads vazios (para o backend subir e o front compilar).
 * Quando você quiser, implementamos as queries reais.
 */

exports.getProdutividadeData = async (req, res) => {
    // payload “neutro” para não quebrar o front caso exista consumo
    return res.json({
        data: [],
        message: 'Produtividade ainda não implementada neste build'
    });
};

exports.getTopAgentes = async (req, res) => {
    return res.json({
        data: [],
        message: 'Top agentes ainda não implementado neste build'
    });
};


