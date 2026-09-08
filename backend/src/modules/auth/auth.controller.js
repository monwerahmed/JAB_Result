const authService = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.validation');
const { asyncHandler } = require('../../utils/errorHandler');

const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json({ success: true, message: 'Admin registered successfully.', data: result });
});

const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.status(200).json({ success: true, message: 'Login successful.', data: result });
});

const getMe = asyncHandler(async (req, res) => {
  const admin = await authService.getMe(req.admin.id);
  res.status(200).json({ success: true, data: admin });
});

module.exports = { register, login, getMe };
