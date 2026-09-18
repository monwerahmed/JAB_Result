-- AlterTable
ALTER TABLE "MarkRecord" ADD COLUMN     "classTestId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ClassTest" (
    "id" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "testNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassTest_classSubjectId_semester_idx" ON "ClassTest"("classSubjectId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTest_classSubjectId_semester_testNumber_key" ON "ClassTest"("classSubjectId", "semester", "testNumber");

-- AddForeignKey
ALTER TABLE "ClassTest" ADD CONSTRAINT "ClassTest_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkRecord" ADD CONSTRAINT "MarkRecord_classTestId_fkey" FOREIGN KEY ("classTestId") REFERENCES "ClassTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
