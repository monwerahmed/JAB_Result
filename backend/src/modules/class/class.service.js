const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getAllClasses = async () => {
  return prisma.class.findMany({
    include: { _count: { select: { students: true, subjects: true } } },
    orderBy: { className: 'asc' },
  });
};

const getClassById = async (id) => {
  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      subjects: { orderBy: { subjectName: 'asc' } },
      students: { orderBy: { rollNumber: 'asc' } },
      _count: { select: { students: true, subjects: true } },
    },
  });
  if (!cls) throw new AppError('Class not found.', 404);
  return cls;
};

module.exports = { getAllClasses, getClassById };
