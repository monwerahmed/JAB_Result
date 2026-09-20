const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');
const marksService = require('../marks/marks.service');

const CLASS_SEQUENCE = [
  'Faslul Khas',
  'Muhamada',
  'Ula',
  'Sania',
  'Salesa',
  'Rabea',
  'Khamesa',
];

const normalizeClassName = (name) => {
  if (!name) return '';
  const n = name.trim().toLowerCase();
  if (n.includes('faslul') || n.includes('falsul')) return 'Faslul Khas';
  if (n.includes('muhamada') || n.includes('mumahada') || n.includes('muhamahada')) return 'Muhamada';
  if (n.includes('ula')) return 'Ula';
  if (n.includes('sania')) return 'Sania';
  if (n.includes('salesa')) return 'Salesa';
  if (n.includes('rabea')) return 'Rabea';
  if (n.includes('khamesa')) return 'Khamesa';
  return name;
};

const getNextClassName = (currentClassName) => {
  const normCurrent = normalizeClassName(currentClassName);
  const currentIndex = CLASS_SEQUENCE.findIndex((c) => normalizeClassName(c) === normCurrent);
  if (currentIndex === -1 || currentIndex >= CLASS_SEQUENCE.length - 1) {
    return null; // Highest class or unknown class
  }
  return CLASS_SEQUENCE[currentIndex + 1];
};

const getCurrentSession = async () => {
  let session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  if (!session) {
    session = await prisma.academicSession.create({
      data: { year: '2024-2025', isCurrent: true },
    });
  }
  return session;
};

const getAllSessions = async () => {
  return prisma.academicSession.findMany({
    orderBy: { year: 'desc' },
  });
};

const getNextSessionYear = (currentYearStr) => {
  const parts = currentYearStr.split('-');
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const y1 = parseInt(parts[0], 10) + 1;
    const y2 = parseInt(parts[1], 10) + 1;
    return `${y1}-${y2}`;
  }
  const yearNum = parseInt(currentYearStr, 10);
  if (!isNaN(yearNum)) {
    return `${yearNum + 1}`;
  }
  return `${currentYearStr}-Next`;
};

/**
 * Check promotion eligibility for a single student
 */
const checkStudentPromotionEligibility = async (studentId, academicYear = null) => {
  const currentSession = await getCurrentSession();
  const yearToEvaluate = academicYear || currentSession.year;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) throw new AppError('Student not found.', 404);

  const report = await marksService.generateStudentReport(studentId, 'overall', null, yearToEvaluate);
  const overallStatus = report.summary.overallStatus; // 'PASS', 'PASS_WITH_COMPENSATION', 'FAIL'

  const currentClassName = student.class.className;
  const nextClassName = getNextClassName(currentClassName);

  let nextClassObj = null;
  if (nextClassName) {
    nextClassObj = await prisma.class.findFirst({
      where: {
        OR: [
          { className: nextClassName },
          { className: { contains: nextClassName.split(' ')[0], mode: 'insensitive' } },
        ],
      },
    });
  }

  const targetYear = getNextSessionYear(yearToEvaluate);
  const existingEnrollment = nextClassObj
    ? await prisma.studentClass.findFirst({
        where: { studentId: student.id, classId: nextClassObj.id, academicYear: targetYear },
      })
    : null;

  const isEligible = (overallStatus === 'PASS' || overallStatus === 'PASS_WITH_COMPENSATION') && !!nextClassObj && !existingEnrollment;

  let reason = '';
  if (existingEnrollment) {
    reason = `Student has already been promoted to ${nextClassObj.className} for session ${targetYear}.`;
  } else if (!nextClassName || !nextClassObj) {
    reason = `Student is in the highest class (${currentClassName}). No further promotion available.`;
  } else if (overallStatus === 'PASS') {
    reason = `Eligible for auto-promotion to ${nextClassObj.className} (Passed overall result).`;
  } else if (overallStatus === 'PASS_WITH_COMPENSATION') {
    reason = `Eligible for promotion to ${nextClassObj.className} (Passed through compartment).`;
  } else {
    reason = `Ineligible for promotion: Student failed overall result.`;
  }

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
    },
    currentClass: {
      id: student.class.id,
      className: student.class.className,
    },
    nextClass: nextClassObj ? { id: nextClassObj.id, className: nextClassObj.className } : null,
    academicYear: yearToEvaluate,
    targetAcademicYear: targetYear,
    overallStatus,
    isEligible,
    alreadyPromoted: !!existingEnrollment,
    promotionType: overallStatus === 'PASS' ? 'REGULAR' : overallStatus === 'PASS_WITH_COMPENSATION' ? 'COMPARTMENT' : null,
    reason,
  };
};

/**
 * Execute promotion for a single student
 */
const promoteStudent = async (studentId, customTargetYear = null) => {
  const currentSession = await getCurrentSession();
  const activeYear = currentSession.year;

  const eligibility = await checkStudentPromotionEligibility(studentId, activeYear);
  if (!eligibility.isEligible) {
    throw new AppError(`Cannot promote student: ${eligibility.reason}`, 400);
  }

  const { student, currentClass, nextClass, promotionType, targetAcademicYear } = eligibility;
  const targetYear = customTargetYear || targetAcademicYear;
  const statusLabel = promotionType === 'COMPARTMENT' ? 'COMPARTMENT_PROMOTED' : 'PROMOTED';

  await prisma.$transaction([
    prisma.studentClass.updateMany({
      where: { studentId: student.id, classId: currentClass.id, academicYear: activeYear },
      data: { isCurrent: false, status: statusLabel },
    }),
    prisma.student.update({
      where: { id: student.id },
      data: { classId: nextClass.id },
    }),
    prisma.studentClass.upsert({
      where: {
        studentId_classId_academicYear: {
          studentId: student.id,
          classId: nextClass.id,
          academicYear: targetYear,
        },
      },
      update: { isCurrent: true, status: 'ENROLLED' },
      create: {
        studentId: student.id,
        classId: nextClass.id,
        academicYear: targetYear,
        status: 'ENROLLED',
        isCurrent: true,
      },
    }),
  ]);

  return {
    student,
    fromClass: currentClass,
    toClass: nextClass,
    academicYear: activeYear,
    targetAcademicYear: targetYear,
    promotionType,
    message: `Successfully promoted ${student.name} (${student.rollNumber}) from ${currentClass.className} to ${nextClass.className} for session ${targetYear}.`,
  };
};

/**
 * Bulk Auto-Promote all eligible students in a class or across all classes
 */
const autoPromoteClass = async (classId = null, targetAcademicYear = null) => {
  const currentSession = await getCurrentSession();
  const activeYear = currentSession.year;
  const targetYear = targetAcademicYear || getNextSessionYear(activeYear);

  let students = [];
  if (classId) {
    students = await prisma.student.findMany({
      where: { classId, active: true },
      select: { id: true, name: true, rollNumber: true },
    });
  } else {
    students = await prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, rollNumber: true },
    });
  }

  const results = {
    totalEvaluated: students.length,
    promotedCount: 0,
    regularPromotedCount: 0,
    compartmentPromotedCount: 0,
    ineligibleCount: 0,
    promotedStudents: [],
    skippedStudents: [],
  };

  for (const st of students) {
    try {
      const eligibility = await checkStudentPromotionEligibility(st.id, activeYear);
      if (eligibility.isEligible) {
        const res = await promoteStudent(st.id, targetYear);
        results.promotedCount++;
        if (eligibility.promotionType === 'COMPARTMENT') {
          results.compartmentPromotedCount++;
        } else {
          results.regularPromotedCount++;
        }
        results.promotedStudents.push({
          studentId: st.id,
          name: st.name,
          rollNumber: st.rollNumber,
          fromClass: res.fromClass.className,
          toClass: res.toClass.className,
          promotionType: eligibility.promotionType,
        });
      } else {
        results.ineligibleCount++;
        results.skippedStudents.push({
          studentId: st.id,
          name: st.name,
          rollNumber: st.rollNumber,
          reason: eligibility.reason,
        });
      }
    } catch (err) {
      results.ineligibleCount++;
      results.skippedStudents.push({
        studentId: st.id,
        name: st.name,
        rollNumber: st.rollNumber,
        reason: err.message || 'Error processing promotion',
      });
    }
  }

  return results;
};

/**
 * Execute End-of-Year Fresh Start:
 * 1. Promotes eligible students to new academic session
 * 2. Sets new AcademicSession as current
 * 3. Fresh mark slate ready for the new academic year
 */
const executeFreshStart = async (newYearString = null) => {
  const currentSession = await getCurrentSession();
  const currentYear = currentSession.year;
  const nextYear = newYearString || getNextSessionYear(currentYear);

  // Auto promote all active passed students to the next session
  const promotionSummary = await autoPromoteClass(null, nextYear);

  // Set new AcademicSession as current
  await prisma.$transaction([
    prisma.academicSession.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.academicSession.upsert({
      where: { year: nextYear },
      update: { isCurrent: true },
      create: { year: nextYear, isCurrent: true },
    }),
  ]);

  return {
    previousSession: currentYear,
    activeSession: nextYear,
    promotionSummary,
    message: `End-of-year fresh start completed! Active session set to ${nextYear}. ${promotionSummary.promotedCount} student(s) promoted. Fresh mark records are ready for the new academic year.`,
  };
};

/**
 * Clear/reset marks for a specific class in an academic session
 */
const resetYearMarks = async (classId, academicYear = null) => {
  const currentSession = await getCurrentSession();
  const targetYear = academicYear || currentSession.year;

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const deletedMarks = await prisma.markRecord.deleteMany({
    where: {
      studentId: { in: studentIds },
      academicYear: targetYear,
    },
  });

  return {
    classId,
    academicYear: targetYear,
    deletedMarksCount: deletedMarks.count,
    message: `Marks refreshed for class in session ${targetYear}. Reset ${deletedMarks.count} mark record(s).`,
  };
};

/**
 * Get student class history timeline
 */
const getStudentClassHistory = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      studentClasses: {
        include: { class: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!student) throw new AppError('Student not found.', 404);
  return student.studentClasses;
};

module.exports = {
  CLASS_SEQUENCE,
  normalizeClassName,
  getNextClassName,
  getCurrentSession,
  getAllSessions,
  checkStudentPromotionEligibility,
  promoteStudent,
  autoPromoteClass,
  executeFreshStart,
  resetYearMarks,
  getStudentClassHistory,
};
