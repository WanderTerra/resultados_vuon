const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);
router.post('/create-user', authenticate, authController.createUser);

module.exports = router;
