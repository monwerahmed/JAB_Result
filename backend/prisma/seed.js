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

  const testStudent = await prisma.student.upsert({
    where: { rollNumber: 'TEST-001' },
    update: { name: 'Test Student', classId: seededClasses.Khamesa.id, active: true },
    create: { name: 'Test Student', rollNumber: 'TEST-001', classId: seededClasses.Khamesa.id },
  });

  const seededClassSubjects = await prisma.classSubject.findMany({
    where: { classId: seededClasses.Khamesa.id },
    include: { subject: true },
  });

  for (const classSubject of seededClassSubjects) {
    for (const semester of [1, 2]) {
      const classTest = await prisma.classTest.upsert({
        where: {
          classSubjectId_semester_testNumber: {
            classSubjectId: classSubject.id,
            semester,
            testNumber: 1,
          },
        },
        update: { totalMarks: 20 },
        create: { classSubjectId: classSubject.id, semester, testNumber: 1, totalMarks: 20 },
      });

      const existingClassTestMark = await prisma.markRecord.findFirst({
        where: { studentId: testStudent.id, classTestId: classTest.id },
      });
      const classTestData = { obtainedMarks: semester === 1 ? 16 : 18, totalMarks: 20 };
      if (existingClassTestMark) {
        await prisma.markRecord.update({ where: { id: existingClassTestMark.id }, data: classTestData });
      } else {
        await prisma.markRecord.create({
          data: { studentId: testStudent.id, subjectId: classSubject.subjectId, classTestId: classTest.id, semester, examType: 'CLASS_TEST', ...classTestData },
        });
      }

      const existingFinalTerm = await prisma.markRecord.findFirst({
        where: { studentId: testStudent.id, subjectId: classSubject.subjectId, semester, examType: 'FINAL_TERM' },
      });
      const finalTermData = { obtainedMarks: semester === 1 ? 78 : 82, totalMarks: 100 };
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
