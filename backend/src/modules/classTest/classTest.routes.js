const express = require('express');
const router = express.Router();
const controller = require('./classTest.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);
router.get('/', controller.getClassTests);
router.post('/', controller.createClassTest);
router.put('/:id', controller.updateClassTest);
router.delete('/:id', controller.deleteClassTest);

module.exports = router;
