const { z } = require('zod');

const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  rollNumber: z.string().min(1, 'Roll number is required').max(20),
  classId: z.string().uuid('Invalid class ID'),
});

const updateStudentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  rollNumber: z.string().min(1).max(20).optional(),
  classId: z.string().uuid('Invalid class ID').optional(),
});

module.exports = { createStudentSchema, updateStudentSchema };
