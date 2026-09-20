const express = require('express');
const router = express.Router();
const promotionController = require('./promotion.controller');
const { protect } = require('../../central-middleware/auth.middleware');

router.use(protect);

router.get('/sessions', promotionController.getSessions);
router.get('/eligibility/:studentId', promotionController.checkEligibility);
router.post('/promote', promotionController.promoteStudent);
router.post('/auto-promote', promotionController.autoPromoteClass);
router.post('/fresh-start', promotionController.executeFreshStart);
router.post('/reset-marks', promotionController.resetYearMarks);
router.get('/history/:studentId', promotionController.getStudentHistory);

module.exports = router;
