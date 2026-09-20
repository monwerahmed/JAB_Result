const prisma = require('../../utils/prisma');
const { AppError } = require('../../utils/errorHandler');

const FINAL_TERM_TOTAL_MARKS = 100;

// ─────────────────────────────────────────────
// CALCULATION ENGINE
// ─────────────────────────────────────────────

/**
 * Calculate semester score for a subject using:
 * Score = (Avg% of ClassTests * 0.25) + (FinalTerm% * 0.75)
 * If no class tests were taken, the final term is treated as the full 100%.
 */
const calcSemesterScore = (classTests, finalTerm) => {
  const finalTermPct = finalTerm ? Math.round((finalTerm.obtainedMarks / finalTerm.totalMarks) * 100) : 0;

  let classTestWeight = 0;
  let classTestAvgPct = null;
  if (classTests.length > 0) {
    const classTestObtained = classTests.reduce((sum, test) => sum + test.obtainedMarks, 0);
    const classTestTotal = classTests.reduce((sum, test) => sum + test.totalMarks, 0);
    const combinedPct = classTestTotal > 0 ? (classTestObtained / classTestTotal) * 100 : 0;
    classTestWeight = combinedPct * 0.25;
    classTestAvgPct = Math.round(combinedPct);
  }

  const hasClassTests = classTests.length > 0;
  const finalTermWeight = finalTermPct * (hasClassTests ? 0.75 : 1);
  const semesterScore = Math.round(classTestWeight + finalTermWeight); // out of 100

  return {
    semesterScore,              // percentage score 0-100
    classTestAvgPct,
    classTestCombinedPct: classTestAvgPct,
    classTestWeightedMarks: Math.round(classTestWeight),
    finalTermPct,
    finalTermWeightedMarks: Math.round(finalTermWeight),
    hasClassTests,
    classTestCount: classTests.length,
  };
};

/**
 * Determine per-semester pass status.
 * Quran: need >= 60%, Others: need >= 50%. GK is displayed with a 60% pass
 * mark but is excluded from the overall fail decision.
 */
const getSemesterStatus = (semesterScore, isQuran, isGeneralKnowledge) => {
  const passMark = isQuran || isGeneralKnowledge ? 60 : 50;
  return {
    passed: isGeneralKnowledge || semesterScore >= passMark,
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
    return {
      sem1Score,
      sem2Score,
      totalScore,
      status: 'PASS',
      gkBonusEligible: false,
    };
  }

  if (isQuran) {
    if (sem1Score < 60 || sem2Score < 60) {
      return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'Quran requires at least 60% in both semesters; compensation is not allowed' };
    }
    return { sem1Score, sem2Score, totalScore, status: 'PASS' };
  }

  if (sem1Score < 50 || sem2Score < 50) {
    return { sem1Score, sem2Score, totalScore, status: 'FAIL', reason: 'At least 50% is required in both semesters; compensation is not allowed' };
  }
  return { sem1Score, sem2Score, totalScore, status: 'PASS' };
};

// ─────────────────────────────────────────────
// MARKS SERVICE
// ─────────────────────────────────────────────

const getActiveSessionYear = async () => {
  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  return session ? session.year : '2024-2025';
};

const submitMarks = async (records) => {
  const results = [];
  const activeYear = await getActiveSessionYear();

  for (const record of records) {
    const yearToUse = record.academicYear || activeYear;
    // Validate student and subject exist
    const [student, subject] = await Promise.all([
      prisma.student.findUnique({ where: { id: record.studentId } }),
      prisma.subject.findUnique({ where: { id: record.subjectId } }),
    ]);

    if (!student) throw new AppError(`Student not found: ${record.studentId}`, 404);
    if (!student.active) throw new AppError('Inactive students cannot receive marks.', 400);
    if (!subject) throw new AppError(`Subject not found: ${record.subjectId}`, 404);
    const classSubject = await prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId: student.classId, subjectId: subject.id } },
    });
    if (!classSubject) {
      throw new AppError(`Subject does not belong to student's class.`, 400);
    }

    if (record.examType === 'CLASS_TEST') {
      if (!record.classTestId) throw new AppError('A class test definition is required.', 400);
      const classTest = await prisma.classTest.findUnique({ where: { id: record.classTestId } });
      if (!classTest || classTest.classSubjectId !== classSubject.id || classTest.semester !== record.semester) {
        throw new AppError('Class test does not belong to this class, subject, or semester.', 400);
      }
      if (record.totalMarks !== classTest.totalMarks) {
        throw new AppError('Total marks must match the class test definition.', 400);
      }
    }

    // For FINAL_TERM: only one allowed per student/subject/semester/academicYear — upsert
    if (record.examType === 'FINAL_TERM') {
      const existing = await prisma.markRecord.findFirst({
        where: {
          studentId: record.studentId,
          subjectId: record.subjectId,
          semester: record.semester,
          examType: 'FINAL_TERM',
          academicYear: yearToUse,
        },
      });

      let result;
      if (existing) {
        result = await prisma.markRecord.update({
          where: { id: existing.id },
          data: { obtainedMarks: record.obtainedMarks, totalMarks: FINAL_TERM_TOTAL_MARKS, academicYear: yearToUse },
        });
      } else {
        result = await prisma.markRecord.create({ data: { ...record, totalMarks: FINAL_TERM_TOTAL_MARKS, academicYear: yearToUse } });
      }
      results.push(result);
    } else {
      const roundedObtainedMarks = Math.round(record.obtainedMarks);
      const existing = await prisma.markRecord.findFirst({
        where: {
          studentId: record.studentId,
          classTestId: record.classTestId,
          academicYear: yearToUse,
        },
      });

      const result = existing
        ? await prisma.markRecord.update({
            where: { id: existing.id },
            data: { obtainedMarks: roundedObtainedMarks, totalMarks: record.totalMarks, academicYear: yearToUse },
          })
        : await prisma.markRecord.create({ data: { ...record, obtainedMarks: roundedObtainedMarks, academicYear: yearToUse } });
      results.push(result);
    }
  }

  return results;
};

const getMarksByStudent = async (studentId, semester, academicYear = null) => {
  const activeYear = academicYear || await getActiveSessionYear();
  const where = { studentId, academicYear: activeYear };
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

  const updateData = record.examType === 'CLASS_TEST' && data.obtainedMarks !== undefined
    ? { ...data, obtainedMarks: Math.round(data.obtainedMarks) }
    : record.examType === 'FINAL_TERM'
      ? { ...data, totalMarks: FINAL_TERM_TOTAL_MARKS }
      : data;

  return prisma.markRecord.update({ where: { id }, data: updateData });
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
const generateStudentReport = async (studentId, mode = 'overall', semester = null, academicYear = null) => {
  const activeYear = academicYear || await getActiveSessionYear();
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      markRecords: {
        where: {
          academicYear: activeYear,
        },
        include: {
          subject: true,
        },
      },
    },
  });

  if (!student) throw new AppError('Student not found.', 404);

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: student.classId },
    include: { subject: true },
    orderBy: { subject: { subjectName: 'asc' } },
  });
  const subjects = classSubjects.map(({ subject }) => subject);

  const subjectReports = [];
  const MAX_COMPARTMENTS = 3;
  let grandTotalSem1 = 0;
  let grandTotalSem2 = 0;
  let gkBonus = 0;
  let overallStatus = 'PASS';

  for (const subject of subjects) {
    const subjectMarks = student.markRecords.filter((m) => m.subjectId === subject.id);

    const sem1ClassTests = subjectMarks.filter((m) => m.semester === 1 && m.examType === 'CLASS_TEST');
    const sem1FinalTerm = subjectMarks.find((m) => m.semester === 1 && m.examType === 'FINAL_TERM');
    const sem2ClassTests = subjectMarks.filter((m) => m.semester === 2 && m.examType === 'CLASS_TEST');
    const sem2FinalTerm = subjectMarks.find((m) => m.semester === 2 && m.examType === 'FINAL_TERM');

    const sem1Calc = calcSemesterScore(sem1ClassTests, sem1FinalTerm);
    const sem2Calc = calcSemesterScore(sem2ClassTests, sem2FinalTerm);

    const sem1Status = getSemesterStatus(sem1Calc.semesterScore, subject.isQuran, subject.isGeneralKnowledge);
    const sem2Status = getSemesterStatus(sem2Calc.semesterScore, subject.isQuran, subject.isGeneralKnowledge);

    const finalResult = calcFinalResult(
      sem1Calc.semesterScore,
      sem2Calc.semesterScore,
      subject.isQuran,
      subject.isGeneralKnowledge
    );
    const roundedFinalResult = Object.fromEntries(
      Object.entries(finalResult).map(([key, value]) => [
        key,
        typeof value === 'number' ? Math.round(value) : value,
      ])
    );

    const markTotals = (classTests, finalTerm) => ({
      classTestObtained: parseFloat(classTests.reduce((sum, mark) => sum + mark.obtainedMarks, 0).toFixed(2)),
      classTestTotal: parseFloat(classTests.reduce((sum, mark) => sum + mark.totalMarks, 0).toFixed(2)),
      finalTermObtained: finalTerm?.obtainedMarks ?? null,
      finalTermTotal: finalTerm?.totalMarks ?? null,
    });

    if (!subject.isGeneralKnowledge) {
      grandTotalSem1 += sem1Calc.semesterScore;
      grandTotalSem2 += sem2Calc.semesterScore;
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
          percentage: Math.round((t.obtainedMarks / t.totalMarks) * 100),
        })),
        finalTerm: sem1FinalTerm
          ? {
              id: sem1FinalTerm.id,
              obtainedMarks: sem1FinalTerm.obtainedMarks,
              totalMarks: sem1FinalTerm.totalMarks,
              percentage: Math.round((sem1FinalTerm.obtainedMarks / sem1FinalTerm.totalMarks) * 100),
            }
          : null,
        ...sem1Calc,
        ...sem1Status,
        ...markTotals(sem1ClassTests, sem1FinalTerm),
      },
      semester2: {
        classTests: sem2ClassTests.map((t) => ({
          id: t.id,
          obtainedMarks: t.obtainedMarks,
          totalMarks: t.totalMarks,
          percentage: Math.round((t.obtainedMarks / t.totalMarks) * 100),
        })),
        finalTerm: sem2FinalTerm
          ? {
              id: sem2FinalTerm.id,
              obtainedMarks: sem2FinalTerm.obtainedMarks,
              totalMarks: sem2FinalTerm.totalMarks,
              percentage: Math.round((sem2FinalTerm.obtainedMarks / sem2FinalTerm.totalMarks) * 100),
            }
          : null,
        ...sem2Calc,
        ...sem2Status,
        ...markTotals(sem2ClassTests, sem2FinalTerm),
      },
      finalResult: roundedFinalResult,
    });
  }

  // Overall status
  const compartmentCount = subjectReports.filter(
    (report) => !report.subject.isGeneralKnowledge && report.finalResult.status === 'FAIL'
  ).length;

  if (compartmentCount > MAX_COMPARTMENTS) {
    overallStatus = 'FAIL';
  } else if (compartmentCount > 0) {
    overallStatus = 'PASS_WITH_COMPENSATION';
  } else {
    overallStatus = 'PASS';
  }

  const totalSubjectCount = subjects.filter((s) => !s.isGeneralKnowledge).length;
  const grandTotal = grandTotalSem1 + grandTotalSem2 + gkBonus;
  const maxPossible = totalSubjectCount * 200; // each subject max 200 (100 per sem)

  const semesterSummary = (semester) => {
    const scoreKey = semester === 1 ? 'semester1' : 'semester2';
    const scores = subjectReports.filter((r) => !r.subject.isGeneralKnowledge);
    const total = scores.reduce((sum, r) => sum + r[scoreKey].semesterScore, 0);
    const failed = scores.filter((r) => !r[scoreKey].passed).length;
    const obtained = scores.reduce((sum, r) => sum + (r[scoreKey].finalTermObtained || 0), 0);
    const maximum = scores.reduce((sum, r) => sum + (r[scoreKey].finalTermTotal || 0), 0);
    return {
      semester,
      total: Math.round(total),
      maxPossible: totalSubjectCount * 100,
      percentage: totalSubjectCount ? Math.round((total / (totalSubjectCount * 100)) * 100) : 0,
      obtainedMarks: Math.round(obtained),
      totalMarks: Math.round(maximum),
      passedSubjects: scores.length - failed,
      failedSubjects: failed,
      status: failed > 0 ? 'FAIL' : 'PASS',
    };
  };

  return {
    reportMode: mode === 'semester' ? 'semester' : 'overall',
    selectedSemester: mode === 'semester' && semester ? Number(semester) : null,
    academicYear: activeYear,
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      classId: student.classId,
      class: student.class.className,
    },
    subjectReports,
    semester1Summary: semesterSummary(1),
    semester2Summary: semesterSummary(2),
    summary: {
      grandTotalSem1: Math.round(grandTotalSem1),
      grandTotalSem2: Math.round(grandTotalSem2),
      combinedTotal: Math.round(grandTotalSem1 + grandTotalSem2),
      obtainedMarks: Math.round(grandTotalSem1 + grandTotalSem2),
      totalMarks: maxPossible,
      gkBonus,
      grandTotal: Math.round(grandTotal),
      maxPossible,
      overallPercentage: Math.round((grandTotal / maxPossible) * 100),
      overallStatus,
      compartmentCount,
      maxCompartments: MAX_COMPARTMENTS,
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
const generateClassReport = async (classId, semester, academicYear = null) => {
  const activeYear = academicYear || await getActiveSessionYear();
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new AppError('Class not found.', 404);

  const students = await prisma.student.findMany({
    where: { classId, active: true },
    select: { id: true },
    orderBy: { rollNumber: 'asc' },
  });

  const reports = await Promise.all(students.map((s) => generateStudentReport(s.id, 'overall', semester, activeYear)));
  const summary = reports.map((report) => ({
    student: report.student,
    semester1: report.semester1Summary,
    semester2: report.semester2Summary,
    overall: report.summary,
    subjectReports: report.subjectReports,
  }));
  const ranking = semester ? `semester${Number(semester)}` : 'overall';
  const highest = summary.reduce((leader, item) => (
    !leader || item[ranking].obtainedMarks > leader[ranking].obtainedMarks ? item : leader
  ), null);
  const highestResult = highest?.[ranking];
  return {
    class: cls,
    academicYear: activeYear,
    semester: semester ? Number(semester) : null,
    studentReports: reports,
    summary,
    highestStudent: highest ? {
      student: highest.student,
      obtainedMarks: highestResult.obtainedMarks,
      totalMarks: highestResult.totalMarks,
      percentage: highestResult.percentage ?? highestResult.overallPercentage,
    } : null,
  };
};

module.exports = {
  submitMarks,
  getMarksByStudent,
  updateMark,
  deleteMark,
  generateStudentReport,
  generateClassReport,
  getActiveSessionYear,
};

