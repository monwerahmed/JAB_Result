const { z } = require('zod');

const markRecordSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  semester: z.number().int().min(1).max(2),
  examType: z.enum(['CLASS_TEST', 'FINAL_TERM']),
  obtainedMarks: z.number().min(0, 'Obtained marks cannot be negative'),
  totalMarks: z.number().positive('Total marks must be positive'),
}).refine(
  (data) => data.obtainedMarks <= data.totalMarks,
  { message: 'Obtained marks cannot exceed total marks', path: ['obtainedMarks'] }
);

const bulkMarkSchema = z.object({
  records: z.array(markRecordSchema).min(1, 'At least one record is required'),
});

const updateMarkSchema = z.object({
  obtainedMarks: z.number().min(0).optional(),
  totalMarks: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.obtainedMarks !== undefined && data.totalMarks !== undefined) {
      return data.obtainedMarks <= data.totalMarks;
    }
    return true;
  },
  { message: 'Obtained marks cannot exceed total marks', path: ['obtainedMarks'] }
);

module.exports = { markRecordSchema, bulkMarkSchema, updateMarkSchema };
