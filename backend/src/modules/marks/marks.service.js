const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

// ─────────────────────────────────────────────
// CALCULATION ENGINE
// ─────────────────────────────────────────────

/**
 * Calculate semester score for a subject using:
 * Score = (Avg% of ClassTests * 0.25) + (FinalTerm% * 0.75)
 * If no class tests: the 25% weight defaults to 0
 */
const calcSemesterScore = (classTests, finalTerm) => {
  const finalTermPct = finalTerm ? (finalTerm.obtainedMarks / finalTerm.totalMarks) * 100 : 0;

  let classTestWeight = 0;
  if (classTests.length > 0) {
    const avgPct =
      classTests.reduce((sum, t) => sum + (t.obtainedMarks / t.totalMarks) * 100, 0) /
      classTests.length;
    classTestWeight = avgPct * 0.25;
  }

  const finalTermWeight = finalTermPct * 0.75;
  const semesterScore = classTestWeight + finalTermWeight; // out of 100

  return {
    semesterScore,              // percentage score 0-100
    classTestAvgPct: classTests.length > 0
      ? classTests.reduce((s, t) => s + (t.obtainedMarks / t.totalMarks) * 100, 0) / classTests.length
      : null,
    finalTermPct,
    hasClassTests: classTests.length > 0,
    classTestCount: classTests.length,
  };
};

/**
 * Determine per-semester pass status.
 * Quran: need >= 70%, Others: need >= 60%
 */
const getSemesterStatus = (semesterScore, isQuran) => {
  const passMark = isQuran ? 70 : 60;
  return {
    passed: semesterScore >= passMark,
    passMark,
    semesterScore,
  };
};

/**
 * Calculate final annual result (Semester 1 + Semester 2 combined).
 * Returns full breakdown with compensation logic.
 */
const calcFinalResult = (sem1Score, sem2Score, isQuran, isGK) => {
  const totalScore = sem1Score + sem2Score; // sum of two semester % scores (max 200)

  if (isGK) {
    // GK: pass mark is 20% of weight — evaluated separately; not added to grand total
    // Return a simple result for GK
    return {
      sem1Score,
      sem2Score,
      totalScore,
      status: 'GK_SEPARATE', // handled at report level
      gkBonusEligible: sem2Score > 60 || sem1Score > 60, // either semester > 60%
    };
  }

  if (isQuran) {
    // Quran: total >= 140 to pass (out of 200)
    // Compensation: sem2 < 60 but total >= 140 (minimum 120 to qualify)
    if (totalScore < 120) {
      return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'Total below 120 (absolute minimum)' };
    }
    if (totalScore >= 140) {
      if (sem2Score < 60) {
        return { sem1Score, sem2Score, totalScore, status: 'PASS_WITH_COMPENSATION', reason: 'Sem 2 < 60% but total >= 140' };
      }
      return { sem1Score, sem2Score, totalScore, status: 'PASS' };
    }
    // 120 <= total < 140
    return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'Total below 140 required for Quran' };
  }

  // Standard subjects
  // Auto fail if sem2 < 50
  if (sem2Score < 50) {
    return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'Semester 2 score below 50% (automatic fail)' };
  }
  if (totalScore < 100) {
    return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'Total below 100 (absolute minimum)' };
  }
  if (totalScore >= 120) {
    return { sem1Score, sem2Score, totalScore, status: 'PASS' };
  }
  // 100 <= total < 120: compensation territory (sem2 >= 50 confirmed above)
  return { sem1Score, sem2Score, totalScore, status: 'PASS_WITH_COMPENSATION', reason: 'Total 100-119, Sem 2 >= 50%' };
};

// ─────────────────────────────────────────────
// MARKS SERVICE
// ─────────────────────────────────────────────

const submitMarks = async (records) => {
  const results = [];

  for (const record of records) {
    // Validate student and subject exist
    const [student, subject] = await Promise.all([
      prisma.student.findUnique({ where: { id: record.studentId } }),
      prisma.subject.findUnique({ where: { id: record.subjectId } }),
    ]);

    if (!student) throw new AppError(`Student not found: ${record.studentId}`, 404);
    if (!subject) throw new AppError(`Subject not found: ${record.subjectId}`, 404);
    if (student.classId !== subject.classId) {
      throw new AppError(`Subject does not belong to student's class.`, 400);
    }

    // For FINAL_TERM: only one allowed per student/subject/semester — upsert
    if (record.examType === 'FINAL_TERM') {
      const existing = await prisma.markRecord.findFirst({
        where: {
          studentId: record.studentId,
          subjectId: record.subjectId,
          semester: record.semester,
          examType: 'FINAL_TERM',
        },
      });

      let result;
      if (existing) {
        result = await prisma.markRecord.update({
          where: { id: existing.id },
          data: { obtainedMarks: record.obtainedMarks, totalMarks: record.totalMarks },
        });
      } else {
        result = await prisma.markRecord.create({ data: record });
      }
      results.push(result);
    } else {
      // CLASS_TEST: allow multiple; just create
      const result = await prisma.markRecord.create({ data: record });
      results.push(result);
    }
  }

  return results;
};

const getMarksByStudent = async (studentId, semester) => {
  const where = { studentId };
  if (semester) where.semester = Number(semester);

  return prisma.markRecord.findMany({
    where,
    include: {
      subject: { select: { id: true, subjectName: true, isQuran: true, isGeneralKnowledge: true } },
    },
    orderBy: [{ semester: 'asc' }, { subject: { subjectName: 'asc' } }, { examType: 'asc' }],
  });
};

const updateMark = async (id, data) => {
  const record = await prisma.markRecord.findUnique({ where: { id } });
  if (!record) throw new AppError('Mark record not found.', 404);

  if (data.obtainedMarks !== undefined && data.totalMarks === undefined) {
    if (data.obtainedMarks > record.totalMarks) {
      throw new AppError('Obtained marks exceed existing total marks.', 400);
    }
  }

  return prisma.markRecord.update({ where: { id }, data });
};

const deleteMark = async (id) => {
  const record = await prisma.markRecord.findUnique({ where: { id } });
  if (!record) throw new AppError('Mark record not found.', 404);
  return prisma.markRecord.delete({ where: { id } });
};

/**
 * Generate the full result report for a student.
 * Returns per-subject breakdowns for both semesters, compensation flags,
 * GK bonus calculation, and an overall pass/fail verdict.
 */
const generateStudentReport = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      markRecords: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!student) throw new AppError('Student not found.', 404);

  const subjects = await prisma.subject.findMany({
    where: { classId: student.classId },
  });

  const subjectReports = [];
  let grandTotalSem1 = 0;
  let grandTotalSem2 = 0;
  let gkBonus = 0;
  let hasAnyFail = false;
  let overallStatus = 'PASS';

  for (const subject of subjects) {
    const subjectMarks = student.markRecords.filter((m) => m.subjectId === subject.id);

    const sem1ClassTests = subjectMarks.filter((m) => m.semester === 1 && m.examType === 'CLASS_TEST');
    const sem1FinalTerm = subjectMarks.find((m) => m.semester === 1 && m.examType === 'FINAL_TERM');
    const sem2ClassTests = subjectMarks.filter((m) => m.semester === 2 && m.examType === 'CLASS_TEST');
    const sem2FinalTerm = subjectMarks.find((m) => m.semester === 2 && m.examType === 'FINAL_TERM');

    const sem1Calc = calcSemesterScore(sem1ClassTests, sem1FinalTerm);
    const sem2Calc = calcSemesterScore(sem2ClassTests, sem2FinalTerm);

    const sem1Status = getSemesterStatus(sem1Calc.semesterScore, subject.isQuran);
    const sem2Status = getSemesterStatus(sem2Calc.semesterScore, subject.isQuran);

    const finalResult = calcFinalResult(
      sem1Calc.semesterScore,
      sem2Calc.semesterScore,
      subject.isQuran,
      subject.isGeneralKnowledge
    );

    // GK bonus logic
    if (subject.isGeneralKnowledge) {
      // Check if sem2 GK percentage > 60
      if (sem2Calc.semesterScore > 60) {
        gkBonus = 10;
      }
    } else {
      // Add to grand totals (GK not included in grand total by default)
      grandTotalSem1 += sem1Calc.semesterScore;
      grandTotalSem2 += sem2Calc.semesterScore;
    }

    if (finalResult.status === 'FAIL') {
      hasAnyFail = true;
    }

    subjectReports.push({
      subject: {
        id: subject.id,
        name: subject.subjectName,
        isQuran: subject.isQuran,
        isGeneralKnowledge: subject.isGeneralKnowledge,
      },
      semester1: {
        classTests: sem1ClassTests.map((t) => ({
          id: t.id,
          obtainedMarks: t.obtainedMarks,
          totalMarks: t.totalMarks,
          percentage: (t.obtainedMarks / t.totalMarks) * 100,
        })),
        finalTerm: sem1FinalTerm
          ? {
              id: sem1FinalTerm.id,
              obtainedMarks: sem1FinalTerm.obtainedMarks,
              totalMarks: sem1FinalTerm.totalMarks,
              percentage: (sem1FinalTerm.obtainedMarks / sem1FinalTerm.totalMarks) * 100,
            }
          : null,
        ...sem1Calc,
        ...sem1Status,
      },
      semester2: {
        classTests: sem2ClassTests.map((t) => ({
          id: t.id,
          obtainedMarks: t.obtainedMarks,
          totalMarks: t.totalMarks,
          percentage: (t.obtainedMarks / t.totalMarks) * 100,
        })),
        finalTerm: sem2FinalTerm
          ? {
              id: sem2FinalTerm.id,
              obtainedMarks: sem2FinalTerm.obtainedMarks,
              totalMarks: sem2FinalTerm.totalMarks,
              percentage: (sem2FinalTerm.obtainedMarks / sem2FinalTerm.totalMarks) * 100,
            }
          : null,
        ...sem2Calc,
        ...sem2Status,
      },
      finalResult,
    });
  }

  // Overall status
  const hasCompensation = subjectReports.some(
    (r) => !r.subject.isGeneralKnowledge && r.finalResult.status === 'PASS_WITH_COMPENSATION'
  );

  if (hasAnyFail) {
    overallStatus = 'FAIL';
  } else if (hasCompensation) {
    overallStatus = 'PASS_WITH_COMPENSATION';
  } else {
    overallStatus = 'PASS';
  }

  const totalSubjectCount = subjects.filter((s) => !s.isGeneralKnowledge).length;
  const grandTotal = grandTotalSem1 + grandTotalSem2 + gkBonus;
  const maxPossible = totalSubjectCount * 200; // each subject max 200 (100 per sem)

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      class: student.class.className,
    },
    subjectReports,
    summary: {
      grandTotalSem1: parseFloat(grandTotalSem1.toFixed(2)),
      grandTotalSem2: parseFloat(grandTotalSem2.toFixed(2)),
      combinedTotal: parseFloat((grandTotalSem1 + grandTotalSem2).toFixed(2)),
      gkBonus,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      maxPossible,
      overallPercentage: parseFloat(((grandTotal / maxPossible) * 100).toFixed(2)),
      overallStatus,
      totalSubjectsEvaluated: totalSubjectCount,
      passedSubjects: subjectReports.filter(
        (r) => !r.subject.isGeneralKnowledge && ['PASS', 'PASS_WITH_COMPENSATION'].includes(r.finalResult.status)
      ).length,
      failedSubjects: subjectReports.filter(
        (r) => !r.subject.isGeneralKnowledge && r.finalResult.status === 'FAIL'
      ).length,
    },
  };
};

/**
 * Generate class-wide report (all students in a class)
 */
const generateClassReport = async (classId) => {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new AppError('Class not found.', 404);

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
    orderBy: { rollNumber: 'asc' },
  });

  const reports = await Promise.all(students.map((s) => generateStudentReport(s.id)));
  return { class: cls, studentReports: reports };
};

module.exports = {
  submitMarks,
  getMarksByStudent,
  updateMark,
  deleteMark,
  generateStudentReport,
  generateClassReport,
};
