const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getAllStudents = async ({ classId, search, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (classId) where.classId = classId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { rollNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { class: { select: { id: true, className: true } } },
      orderBy: [{ class: { className: 'asc' } }, { rollNumber: 'asc' }],
      skip,
      take: Number(limit),
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!student) throw new AppError('Student not found.', 404);
  return student;
};

const createStudent = async ({ name, rollNumber, classId }) => {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new AppError('Class not found.', 404);

  return prisma.student.create({
    data: { name, rollNumber, classId },
    include: { class: true },
  });
};

const updateStudent = async (id, data) => {
  await getStudentById(id);

  if (data.classId) {
    const cls = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!cls) throw new AppError('Class not found.', 404);
  }

  return prisma.student.update({
    where: { id },
    data,
    include: { class: true },
  });
};

const deleteStudent = async (id) => {
  await getStudentById(id);
  await prisma.markRecord.deleteMany({ where: { studentId: id } });
  return prisma.student.delete({ where: { id } });
};

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent };
