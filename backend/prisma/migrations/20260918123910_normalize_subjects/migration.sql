-- Preserve legacy class assignments and merge duplicate subject rows before
-- removing Subject.classId.
CREATE TABLE "ClassSubject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ClassSubject" ("id", "classId", "subjectId")
SELECT
    md5(s."classId" || ':' || s.id)::uuid::text,
    s."classId",
    MIN(s.id) OVER (PARTITION BY s."subjectName")
FROM "Subject" s;

ALTER TABLE "MarkRecord" DROP CONSTRAINT "MarkRecord_subjectId_fkey";

UPDATE "MarkRecord" m
SET "subjectId" = canonical.id
FROM "Subject" duplicate
JOIN (
    SELECT "subjectName", MIN(id) AS id
    FROM "Subject"
    GROUP BY "subjectName"
) canonical ON canonical."subjectName" = duplicate."subjectName"
WHERE m."subjectId" = duplicate.id
  AND duplicate.id <> canonical.id;

DELETE FROM "Subject" duplicate
USING "Subject" canonical
WHERE duplicate."subjectName" = canonical."subjectName"
  AND duplicate.id > canonical.id;
-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_classId_fkey";

-- DropIndex
DROP INDEX "Subject_subjectName_classId_key";

-- AlterTable
ALTER TABLE "Subject" DROP COLUMN "classId";

-- CreateIndex
CREATE INDEX "ClassSubject_subjectId_idx" ON "ClassSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_subjectName_key" ON "Subject"("subjectName");

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restore marks relation after duplicate subject IDs have been merged.
ALTER TABLE "MarkRecord" ADD CONSTRAINT "MarkRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
