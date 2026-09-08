const subjectService = require('./subject.service');
const { asyncHandler } = require('../../utils/errorHandler');

const getSubjectsByClass = asyncHandler(async (req, res) => {
  const subjects = await subjectService.getSubjectsByClass(req.params.classId);
  res.status(200).json({ success: true, data: subjects });
});

const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id);
  res.status(200).json({ success: true, data: subject });
});

module.exports = { getSubjectsByClass, getSubjectById };
