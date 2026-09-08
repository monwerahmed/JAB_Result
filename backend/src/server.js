require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./utils/errorHandler');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const studentRoutes = require('./modules/student/student.routes');
const marksRoutes = require('./modules/marks/marks.routes');
const classRoutes = require('./modules/class/class.routes');
const subjectRoutes = require('./modules/subject/subject.routes');

const app = express();

// Core Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
