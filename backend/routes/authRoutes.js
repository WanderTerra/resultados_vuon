const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);
router.post('/create-user', authenticate, requirePermission('cadastrar_usuario'), authController.createUser);

module.exports = router;
