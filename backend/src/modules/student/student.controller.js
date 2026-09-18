const studentService = require('./student.service');
const { createStudentSchema, updateStudentSchema } = require('./student.validation');
const { asyncHandler } = require('../../utils/errorHandler');

const getAllStudents = asyncHandler(async (req, res) => {
  const { classId, search, page, limit, includeInactive } = req.query;
  const result = await studentService.getAllStudents({ classId, search, page, limit, includeInactive: includeInactive === 'true' });
  res.status(200).json({ success: true, data: result });
});

const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);
  res.status(200).json({ success: true, data: student });
});

const createStudent = asyncHandler(async (req, res) => {
  const data = createStudentSchema.parse(req.body);
  const student = await studentService.createStudent(data);
  res.status(201).json({ success: true, message: 'Student created successfully.', data: student });
});

const updateStudent = asyncHandler(async (req, res) => {
  const data = updateStudentSchema.parse(req.body);
  const student = await studentService.updateStudent(req.params.id, data);
  res.status(200).json({ success: true, message: 'Student updated successfully.', data: student });
});

const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudent(req.params.id);
  res.status(200).json({ success: true, message: 'Student marked inactive.' });
});

const restoreStudent = asyncHandler(async (req, res) => {
  const student = await studentService.restoreStudent(req.params.id);
  res.status(200).json({ success: true, message: 'Student restored.', data: student });
});

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent, restoreStudent };
