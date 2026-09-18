const marksService = require('./marks.service');
const { bulkMarkSchema, updateMarkSchema } = require('./marks.validation');
const { asyncHandler } = require('../../utils/errorHandler');

const submitMarks = asyncHandler(async (req, res) => {
  const { records } = bulkMarkSchema.parse(req.body);
  const result = await marksService.submitMarks(records);
  res.status(201).json({ success: true, message: `${result.length} mark record(s) saved.`, data: result });
});

const getMarksByStudent = asyncHandler(async (req, res) => {
  const { semester } = req.query;
  const marks = await marksService.getMarksByStudent(req.params.studentId, semester);
  res.status(200).json({ success: true, data: marks });
});

const updateMark = asyncHandler(async (req, res) => {
  const data = updateMarkSchema.parse(req.body);
  const mark = await marksService.updateMark(req.params.id, data);
  res.status(200).json({ success: true, message: 'Mark updated.', data: mark });
});

const deleteMark = asyncHandler(async (req, res) => {
  await marksService.deleteMark(req.params.id);
  res.status(200).json({ success: true, message: 'Mark record deleted.' });
});

const getStudentReport = asyncHandler(async (req, res) => {
  const report = await marksService.generateStudentReport(req.params.studentId, req.query.mode, req.query.semester);
  res.status(200).json({ success: true, data: report });
});

const getClassReport = asyncHandler(async (req, res) => {
  const report = await marksService.generateClassReport(req.params.classId, req.query.semester);
  res.status(200).json({ success: true, data: report });
});

module.exports = { submitMarks, getMarksByStudent, updateMark, deleteMark, getStudentReport, getClassReport };
