const express = require('express');
const router = express.Router();
const marksController = require('./marks.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);

router.post('/', marksController.submitMarks);
router.get('/student/:studentId', marksController.getMarksByStudent);
router.put('/:id', marksController.updateMark);
router.delete('/:id', marksController.deleteMark);

// Report endpoints
router.get('/report/student/:studentId', marksController.getStudentReport);
router.get('/report/class/:classId', marksController.getClassReport);

module.exports = router;
