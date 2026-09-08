const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const classSubjects = {
  'Class 1': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 2': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 3': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Social Studies', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 4': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Social Studies', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Islamiat', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 5': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Social Studies', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Islamiat', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Computer', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 6': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Social Studies', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Islamiat', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Computer', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Arabic', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
  'Class 7': [
    { subjectName: 'Urdu', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'English', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Mathematics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Science', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Social Studies', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Islamiat', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Computer', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Arabic', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Physics', isQuran: false, isGeneralKnowledge: false },
    { subjectName: 'Quran', isQuran: true, isGeneralKnowledge: false },
    { subjectName: 'General Knowledge', isQuran: false, isGeneralKnowledge: true },
  ],
};

async function main() {
  console.log('Seeding database...');

  for (const [className, subjects] of Object.entries(classSubjects)) {
    const cls = await prisma.class.upsert({
      where: { className },
      update: {},
      create: { className },
    });

    for (const subject of subjects) {
      await prisma.subject.upsert({
        where: { subjectName_classId: { subjectName: subject.subjectName, classId: cls.id } },
        update: {},
        create: {
          subjectName: subject.subjectName,
          classId: cls.id,
          isQuran: subject.isQuran,
          isGeneralKnowledge: subject.isGeneralKnowledge,
        },
      });
    }

    console.log(`Seeded ${className} with ${subjects.length} subjects`);
  }

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
