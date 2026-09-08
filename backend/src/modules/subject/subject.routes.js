const express = require('express');
const router = express.Router();
const subjectController = require('./subject.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);

router.get('/class/:classId', subjectController.getSubjectsByClass);
router.get('/:id', subjectController.getSubjectById);

module.exports = router;
