const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const pagamentoController = require('../controllers/pagamentoController');
const produtividadeController = require('../controllers/produtividadeController');
const comparativoController = require('../controllers/comparativoController');
const quartisController = require('../controllers/quartisController');
const agentesController = require('../controllers/agentesController');
const { authenticate, requirePermission } = require('../middleware/auth');

// Rota para buscar dados de todos os blocos (dashboard geral)
router.get('/data', dashboardController.getDashboardData);

// Rota otimizada para buscar dados de um bloco específico
router.get('/bloco/:bloco', dashboardController.getBlocoData);

// Rotas de recebimento
router.get('/recebimento/bloco/:bloco', pagamentoController.getRecebimentoPorBloco);
router.get('/recebimento/all', pagamentoController.getAllRecebimentos);

// Rota do diário de bordo
router.get('/diario-bordo', dashboardController.getDiarioBordo);

// Rotas de produtividade do agente (rotas mais específicas primeiro)
router.get('/produtividade/top-agentes', produtividadeController.getTopAgentes);
router.get('/produtividade', produtividadeController.getProdutividadeData);

// Rota de clientes virgens
router.get('/clientes-virgens', dashboardController.getClientesVirgens);

// Spins do último dia (ontem; fallback último disponível)
router.get('/spins-last-day', dashboardController.getSpinsLastDay);

// Rotas de comparativo
router.get('/comparativo', comparativoController.getComparativo);
router.get('/comparativo/agentes', comparativoController.getAgentes);

// Rotas de quartis
router.get('/quartis', quartisController.getQuartis);
router.get('/quartis/dda-por-dia', quartisController.getDdaPorDia);
router.get('/quartis/posicao-quartil-por-dia', quartisController.getPosicaoQuartilPorDia);

// Rotas de agentes
router.get('/agentes', authenticate, agentesController.getAll);
router.get('/agentes/from-resultados', authenticate, agentesController.getAgentesFromResultados);
router.get('/agentes/:id', authenticate, agentesController.getById);
router.post('/agentes', authenticate, requirePermission('cadastrar_agentes'), agentesController.create);
router.put('/agentes/:id', authenticate, requirePermission('cadastrar_agentes'), agentesController.update);
router.delete('/agentes/:id', authenticate, requirePermission('cadastrar_agentes'), agentesController.delete);

module.exports = router;

