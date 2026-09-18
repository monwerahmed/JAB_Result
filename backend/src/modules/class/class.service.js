const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getAllClasses = async () => {
  const classes = await prisma.class.findMany({
    include: { _count: { select: { students: true, classSubjects: true } } },
    orderBy: { className: 'asc' },
  });

  return classes.map((cls) => ({
    ...cls,
    _count: { ...cls._count, subjects: cls._count.classSubjects },
  }));
};

const getClassById = async (id) => {
  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      classSubjects: {
        include: { subject: true },
        orderBy: { subject: { subjectName: 'asc' } },
      },
      students: { orderBy: { rollNumber: 'asc' } },
      _count: { select: { students: true, classSubjects: true } },
    },
  });
  if (!cls) throw new AppError('Class not found.', 404);

  const { classSubjects, ...classData } = cls;
  return {
    ...classData,
    subjects: classSubjects.map(({ id: classSubjectId, subject }) => ({ ...subject, classSubjectId })),
  };
};

module.exports = { getAllClasses, getClassById };
