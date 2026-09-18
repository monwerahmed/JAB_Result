const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getClassTests = async ({ classId, semester }) => {
  const where = { classSubject: { classId } };
  if (semester) where.semester = Number(semester);
  return prisma.classTest.findMany({
    where,
    include: { classSubject: { include: { subject: true } } },
    orderBy: [{ semester: 'asc' }, { classSubject: { subject: { subjectName: 'asc' } } }, { testNumber: 'asc' }],
  });
};

const createClassTest = async (data) => {
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: data.classSubjectId },
  });
  if (!classSubject) throw new AppError('Class subject not found.', 404);
  return prisma.classTest.create({ data });
};

const updateClassTest = async (id, data) => {
  const test = await prisma.classTest.findUnique({ where: { id } });
  if (!test) throw new AppError('Class test not found.', 404);
  return prisma.classTest.update({ where: { id }, data });
};

const deleteClassTest = async (id) => {
  const test = await prisma.classTest.findUnique({ where: { id } });
  if (!test) throw new AppError('Class test not found.', 404);
  return prisma.classTest.delete({ where: { id } });
};

module.exports = { getClassTests, createClassTest, updateClassTest, deleteClassTest };
