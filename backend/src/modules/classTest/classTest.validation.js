const { z } = require('zod');

const classTestSchema = z.object({
  classSubjectId: z.string().uuid('Invalid class subject ID'),
  semester: z.number().int().min(1).max(2),
  testNumber: z.number().int().positive(),
  totalMarks: z.number().positive(),
});

module.exports = { classTestSchema };
