const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async ({ name, email, password }) => {
  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    throw new AppError('An admin with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.create({
    data: { name, email, password: hashedPassword },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const token = signToken(admin.id);
  return { admin, token };
};

const login = async ({ email, password }) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken(admin.id);
  const { password: _, ...adminData } = admin;
  return { admin: adminData, token };
};

const getMe = async (adminId) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!admin) throw new AppError('Admin not found.', 404);
  return admin;
};

module.exports = { register, login, getMe };
