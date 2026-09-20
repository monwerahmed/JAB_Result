-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentClass" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2024-2025',
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentClass_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ClassTest" ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '2024-2025';
ALTER TABLE "MarkRecord" ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '2024-2025';

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSession_year_key" ON "AcademicSession"("year");
CREATE UNIQUE INDEX "StudentClass_studentId_classId_academicYear_key" ON "StudentClass"("studentId", "classId", "academicYear");
CREATE INDEX "StudentClass_studentId_isCurrent_idx" ON "StudentClass"("studentId", "isCurrent");

-- Replace indexes to include academic year
DROP INDEX "ClassTest_classSubjectId_semester_testNumber_key";
DROP INDEX "ClassTest_classSubjectId_semester_idx";
CREATE UNIQUE INDEX "ClassTest_classSubjectId_semester_testNumber_academicYear_key" ON "ClassTest"("classSubjectId", "semester", "testNumber", "academicYear");
CREATE INDEX "ClassTest_classSubjectId_semester_academicYear_idx" ON "ClassTest"("classSubjectId", "semester", "academicYear");

DROP INDEX "MarkRecord_studentId_subjectId_semester_examType_idx";
CREATE INDEX "MarkRecord_studentId_subjectId_semester_examType_academicYear_idx" ON "MarkRecord"("studentId", "subjectId", "semester", "examType", "academicYear");

-- AddForeignKey
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
