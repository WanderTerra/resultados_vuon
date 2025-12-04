const express = require('express');
const router = express.Router();
const AloController = require('../controllers/aloController');

router.get('/summary', AloController.getSummary);
router.get('/acoes', AloController.getAcoes);
router.get('/by-date', AloController.getByDate);
router.get('/cpc-cpca/by-date', AloController.getCpcCpcaByDate);
router.get('/cpc-cpca/summary', AloController.getCpcCpcaSummary);
router.get('/date-range', AloController.getDateRange);

module.exports = router;

