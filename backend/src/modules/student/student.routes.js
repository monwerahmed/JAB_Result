const express = require('express');
const router = express.Router();
const studentController = require('./student.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);

router.route('/').get(studentController.getAllStudents).post(studentController.createStudent);

router
  .route('/:id')
  .get(studentController.getStudentById)
  .put(studentController.updateStudent)
  .delete(studentController.deleteStudent);

module.exports = router;
