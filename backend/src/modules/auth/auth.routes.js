const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
