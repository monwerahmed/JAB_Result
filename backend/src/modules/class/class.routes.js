const express = require('express');
const router = express.Router();
const classController = require('./class.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);

router.get('/', classController.getAllClasses);
router.get('/:id', classController.getClassById);

module.exports = router;
