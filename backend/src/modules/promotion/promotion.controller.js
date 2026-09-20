const promotionService = require('./promotion.service');
const { asyncHandler } = require('../../utils/errorHandler');

const getSessions = asyncHandler(async (req, res) => {
  const current = await promotionService.getCurrentSession();
  const all = await promotionService.getAllSessions();
  res.status(200).json({ success: true, data: { current, all } });
});

const checkEligibility = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { academicYear } = req.query;
  const result = await promotionService.checkStudentPromotionEligibility(studentId, academicYear);
  res.status(200).json({ success: true, data: result });
});

const promoteStudent = asyncHandler(async (req, res) => {
  const { studentId, targetAcademicYear } = req.body;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'studentId is required.' });
  }
  const result = await promotionService.promoteStudent(studentId, targetAcademicYear);
  res.status(200).json({ success: true, message: result.message, data: result });
});

const autoPromoteClass = asyncHandler(async (req, res) => {
  const { classId, targetAcademicYear } = req.body;
  const result = await promotionService.autoPromoteClass(classId || null, targetAcademicYear || null);
  res.status(200).json({ success: true, message: `Auto promotion completed for ${result.promotedCount} student(s).`, data: result });
});

const executeFreshStart = asyncHandler(async (req, res) => {
  const { newAcademicYear } = req.body;
  const result = await promotionService.executeFreshStart(newAcademicYear || null);
  res.status(200).json({ success: true, message: result.message, data: result });
});

const resetYearMarks = asyncHandler(async (req, res) => {
  const { classId, academicYear } = req.body;
  if (!classId) {
    return res.status(400).json({ success: false, message: 'classId is required.' });
  }
  const result = await promotionService.resetYearMarks(classId, academicYear || null);
  res.status(200).json({ success: true, message: result.message, data: result });
});

const getStudentHistory = asyncHandler(async (req, res) => {
  const history = await promotionService.getStudentClassHistory(req.params.studentId);
  res.status(200).json({ success: true, data: history });
});

module.exports = {
  getSessions,
  checkEligibility,
  promoteStudent,
  autoPromoteClass,
  executeFreshStart,
  resetYearMarks,
  getStudentHistory,
};
