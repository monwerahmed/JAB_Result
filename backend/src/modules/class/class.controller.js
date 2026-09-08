const classService = require('./class.service');
const { asyncHandler } = require('../../utils/errorHandler');

const getAllClasses = asyncHandler(async (req, res) => {
  const classes = await classService.getAllClasses();
  res.status(200).json({ success: true, data: classes });
});

const getClassById = asyncHandler(async (req, res) => {
  const cls = await classService.getClassById(req.params.id);
  res.status(200).json({ success: true, data: cls });
});

module.exports = { getAllClasses, getClassById };
