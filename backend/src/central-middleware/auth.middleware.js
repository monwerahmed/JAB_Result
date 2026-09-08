const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../utils/errorHandler');
const prisma = require('../utils/prisma');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized. No token provided.', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const admin = await prisma.admin.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true },
  });

  if (!admin) {
    throw new AppError('The admin belonging to this token no longer exists.', 401);
  }

  req.admin = admin;
  next();
});

module.exports = { protect };
