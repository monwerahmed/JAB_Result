const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getSubjectsByClass = async (classId) => {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new AppError('Class not found.', 404);

  return prisma.subject.findMany({
    where: { classId },
    orderBy: { subjectName: 'asc' },
  });
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!subject) throw new AppError('Subject not found.', 404);
  return subject;
};

module.exports = { getSubjectsByClass, getSubjectById };
