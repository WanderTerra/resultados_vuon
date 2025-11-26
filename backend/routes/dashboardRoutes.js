const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const pagamentoController = require('../controllers/pagamentoController');

// Rota para buscar dados de todos os blocos (dashboard geral)
router.get('/data', dashboardController.getDashboardData);

// Rota otimizada para buscar dados de um bloco específico
router.get('/bloco/:bloco', dashboardController.getBlocoData);

// Rotas de recebimento
router.get('/recebimento/bloco/:bloco', pagamentoController.getRecebimentoPorBloco);
router.get('/recebimento/all', pagamentoController.getAllRecebimentos);

module.exports = router;

