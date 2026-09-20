const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const getAllStudents = async ({ classId, search, page = 1, limit = 20, includeInactive = false }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (classId) where.classId = classId;
  if (!includeInactive) where.active = true;
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

  const activeSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  const yearStr = activeSession ? activeSession.year : '2024-2025';

  const student = await prisma.student.create({
    data: { name, rollNumber, classId },
    include: { class: true },
  });

  await prisma.studentClass.upsert({
    where: {
      studentId_classId_academicYear: {
        studentId: student.id,
        classId: student.classId,
        academicYear: yearStr,
      },
    },
    update: { isCurrent: true, status: 'ENROLLED' },
    create: {
      studentId: student.id,
      classId: student.classId,
      academicYear: yearStr,
      status: 'ENROLLED',
      isCurrent: true,
    },
  });

  return student;
};

const updateStudent = async (id, data) => {
  const existing = await getStudentById(id);

  if (data.classId) {
    const cls = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!cls) throw new AppError('Class not found.', 400);

    const activeSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
    const yearStr = activeSession ? activeSession.year : '2024-2025';

    if (existing.classId !== data.classId) {
      await prisma.studentClass.updateMany({
        where: { studentId: id, isCurrent: true },
        data: { isCurrent: false },
      });

      await prisma.studentClass.upsert({
        where: {
          studentId_classId_academicYear: {
            studentId: id,
            classId: data.classId,
            academicYear: yearStr,
          },
        },
        update: { isCurrent: true, status: 'ENROLLED' },
        create: {
          studentId: id,
          classId: data.classId,
          academicYear: yearStr,
          status: 'ENROLLED',
          isCurrent: true,
        },
      });
    }
  }

  return prisma.student.update({
    where: { id },
    data,
    include: { class: true },
  });
};

const deleteStudent = async (id) => {
  await getStudentById(id);
  return prisma.student.update({ where: { id }, data: { active: false } });
};

const restoreStudent = async (id) => {
  await prisma.student.findUniqueOrThrow({ where: { id } });
  return prisma.student.update({ where: { id }, data: { active: true } });
};

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent, restoreStudent };
