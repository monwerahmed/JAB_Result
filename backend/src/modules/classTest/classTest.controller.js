const classTestService = require('./classTest.service');
const { classTestSchema } = require('./classTest.validation');
const { asyncHandler } = require('../../utils/errorHandler');

const getClassTests = asyncHandler(async (req, res) => {
  const tests = await classTestService.getClassTests({ classId: req.query.classId, semester: req.query.semester });
  res.json({ success: true, data: tests });
});

const createClassTest = asyncHandler(async (req, res) => {
  const test = await classTestService.createClassTest(classTestSchema.parse(req.body));
  res.status(201).json({ success: true, message: 'Class test created.', data: test });
});

const updateClassTest = asyncHandler(async (req, res) => {
  const data = classTestSchema.partial().parse(req.body);
  const test = await classTestService.updateClassTest(req.params.id, data);
  res.json({ success: true, message: 'Class test updated.', data: test });
});

const deleteClassTest = asyncHandler(async (req, res) => {
  await classTestService.deleteClassTest(req.params.id);
  res.json({ success: true, message: 'Class test deleted.' });
});

module.exports = { getClassTests, createClassTest, updateClassTest, deleteClassTest };
