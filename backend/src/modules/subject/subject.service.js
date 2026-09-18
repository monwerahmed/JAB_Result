const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getSubjectsByClass = async (classId) => {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new AppError('Class not found.', 404);

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId },
    include: { subject: true },
    orderBy: { subject: { subjectName: 'asc' } },
  });

  return classSubjects.map(({ id: classSubjectId, subject }) => ({ ...subject, classSubjectId }));
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      classSubjects: { include: { class: true } },
    },
  });
  if (!subject) throw new AppError('Subject not found.', 404);
  return subject;
};

module.exports = { getSubjectsByClass, getSubjectById };
