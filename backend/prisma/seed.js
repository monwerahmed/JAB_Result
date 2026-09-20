const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const subjectMetadata = (subjectName) => ({
  isQuran: subjectName === 'Quran Translation' || subjectName === 'Quran Nazera',
  isGeneralKnowledge: subjectName === 'General Knowledge',
});

const classSubjects = {
  Khamesa: ['Quran Translation', 'Tafsir', 'Hadith', 'Arabic Literature', 'Insha', 'Muazena', 'Kalam', 'English', 'Persian', 'Ruhani Khazaen', 'General Knowledge'],
  Rabea: ['Quran Translation', 'Tafsir', 'Hadith', 'Arabic Literature', 'Insha', 'Muazena', 'Kalam', 'English', 'Fiqah', 'Persian', 'Ruhani Khazaen', 'General Knowledge'],
  Salesa: ['Quran Translation', 'Tafsir', 'Hadith', 'Arabic Literature', 'Arabic Grammar', 'Muazena', 'Kalam', 'English', 'Ruhani Khazaen', 'General Knowledge'],
  Sania: ['Quran Translation', 'Hadith', 'Arabic Literature', 'Arabic Grammar', 'Kalam', 'History', 'English', 'Ruhani Khazaen', 'General Knowledge'],
  Ula: ['Quran Translation', 'Hadith', 'Arabic Literature', 'Arabic Grammar', 'Urdu-1', 'Urdu-2', 'English', 'Ruhani Khazaen', 'General Knowledge'],
  Muhamada: ['Quran Nazera', 'Quran Translation', 'Arabic Literature', 'Urdu-1', 'Urdu-2', 'Bengali', 'English', 'Ruhani Khazaen', 'General Knowledge'],
  'Faslul Khas': ['Quran Nazera', 'Arabic Literature', 'Urdu', 'Bengali', 'English', 'General Knowledge'],
};

async function main() {
  console.log('Seeding database...');

  // 1. Seed default AcademicSession
  const currentSession = await prisma.academicSession.upsert({
    where: { year: '2024-2025' },
    update: { isCurrent: true },
    create: { year: '2024-2025', isCurrent: true },
  });
  console.log(`Active Academic Session: ${currentSession.year}`);

  const seededClasses = {};

  for (const [className, subjects] of Object.entries(classSubjects)) {
    const cls = await prisma.class.upsert({
      where: { className },
      update: {},
      create: { className },
    });
    seededClasses[className] = cls;

    for (const subjectName of subjects) {
      const subject = await prisma.subject.upsert({
        where: { subjectName: subjectName },
        update: subjectMetadata(subjectName),
        create: { subjectName, ...subjectMetadata(subjectName) },
      });

      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: cls.id, subjectId: subject.id } },
        update: {},
        create: { classId: cls.id, subjectId: subject.id },
      });
    }

    console.log(`Seeded ${className} with ${subjects.length} subjects`);
  }

  // Seed sample students for testing promotion sequence
  const sampleStudentsData = [
    { name: 'Abdullah Al Mamun', rollNumber: 'FK-001', className: 'Faslul Khas' },
    { name: 'Tariq Ahmad', rollNumber: 'MU-001', className: 'Muhamada' },
    { name: 'Zubair Hossain', rollNumber: 'ULA-001', className: 'Ula' },
    { name: 'Rashid Khan', rollNumber: 'SAN-001', className: 'Sania' },
    { name: 'Bilal Ahmed', rollNumber: 'SAL-001', className: 'Salesa' },
    { name: 'Khalid Hasan', rollNumber: 'RAB-001', className: 'Rabea' },
  ];

  for (const s of sampleStudentsData) {
    const targetClass = seededClasses[s.className];
    if (targetClass) {
      const st = await prisma.student.upsert({
        where: { rollNumber: s.rollNumber },
        update: { name: s.name, classId: targetClass.id, active: true },
        create: { name: s.name, rollNumber: s.rollNumber, classId: targetClass.id },
      });

      await prisma.studentClass.upsert({
        where: {
          studentId_classId_academicYear: {
            studentId: st.id,
            classId: targetClass.id,
            academicYear: currentSession.year,
          },
        },
        update: { status: 'ENROLLED', isCurrent: true },
        create: {
          studentId: st.id,
          classId: targetClass.id,
          academicYear: currentSession.year,
          status: 'ENROLLED',
          isCurrent: true,
        },
      });
    }
  }

  // Seed test student in Khamesa with marks
  const testStudent = await prisma.student.upsert({
    where: { rollNumber: 'TEST-001' },
    update: { name: 'Test Student', classId: seededClasses.Khamesa.id, active: true },
    create: { name: 'Test Student', rollNumber: 'TEST-001', classId: seededClasses.Khamesa.id },
  });

  await prisma.studentClass.upsert({
    where: {
      studentId_classId_academicYear: {
        studentId: testStudent.id,
        classId: seededClasses.Khamesa.id,
        academicYear: currentSession.year,
      },
    },
    update: { status: 'ENROLLED', isCurrent: true },
    create: {
      studentId: testStudent.id,
      classId: seededClasses.Khamesa.id,
      academicYear: currentSession.year,
      status: 'ENROLLED',
      isCurrent: true,
    },
  });

  const seededClassSubjects = await prisma.classSubject.findMany({
    where: { classId: seededClasses.Khamesa.id },
    include: { subject: true },
  });

  for (const classSubject of seededClassSubjects) {
    for (const semester of [1, 2]) {
      const classTest = await prisma.classTest.upsert({
        where: {
          classSubjectId_semester_testNumber_academicYear: {
            classSubjectId: classSubject.id,
            semester,
            testNumber: 1,
            academicYear: currentSession.year,
          },
        },
        update: { totalMarks: 25 },
        create: {
          classSubjectId: classSubject.id,
          semester,
          testNumber: 1,
          totalMarks: 25,
          academicYear: currentSession.year,
        },
      });

      const existingClassTestMark = await prisma.markRecord.findFirst({
        where: { studentId: testStudent.id, classTestId: classTest.id, academicYear: currentSession.year },
      });
      const classTestData = { obtainedMarks: semester === 1 ? 20 : 22, totalMarks: 25, academicYear: currentSession.year };
      if (existingClassTestMark) {
        await prisma.markRecord.update({ where: { id: existingClassTestMark.id }, data: classTestData });
      } else {
        await prisma.markRecord.create({
          data: { studentId: testStudent.id, subjectId: classSubject.subjectId, classTestId: classTest.id, semester, examType: 'CLASS_TEST', ...classTestData },
        });
      }

      const existingFinalTerm = await prisma.markRecord.findFirst({
        where: { studentId: testStudent.id, subjectId: classSubject.subjectId, semester, examType: 'FINAL_TERM', academicYear: currentSession.year },
      });
      const finalTermData = { obtainedMarks: semester === 1 ? 78 : 82, totalMarks: 100, academicYear: currentSession.year };
      if (existingFinalTerm) {
        await prisma.markRecord.update({ where: { id: existingFinalTerm.id }, data: finalTermData });
      } else {
        await prisma.markRecord.create({
          data: { studentId: testStudent.id, subjectId: classSubject.subjectId, semester, examType: 'FINAL_TERM', ...finalTermData },
        });
      }
    }
  }

  console.log(`Seeded Test Student (${testStudent.rollNumber}) with both semester results for ${seededClassSubjects.length} subjects`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

