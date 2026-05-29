const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { errorResponse, successResponse } = require('../utils/api-response');

const router = express.Router();
const prisma = new PrismaClient();


// ? changes - 
// reduced response time using the promise all 
// instead of querying sequentially , queried simultaniously
// used common response object 
// only admin is permitted to access this route 
// GET /api/reports/doctor-stats
// Highly inefficient nested loop aggregate reporting for admin/receptionists dashboard
// PERFORMANCE BUG: Performs multiple nested DB queries inside a loop for every doctor.
// Runs sequentially, blocking/scaling terrible with doctors count.
router.get('/doctor-stats', authenticate, authorize('ADMIN'),  async (req, res) => {
  try {
    const start = Date.now();

    // 1. Fetch all doctors in one query
    const doctors = await prisma.doctor.findMany();

    if (doctors.length === 0) {
      return res.json({
        success: true,
        timeTakenMs: 0,
        data: [],
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = await Promise.all(
      doctors.map(async (doc) => {

        const [
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize,
        ] = await Promise.all([
          prisma.appointment.count({
            where: { doctorId: doc.id },
          }),
          prisma.appointment.count({
            where: { doctorId: doc.id, status: 'COMPLETED' },
          }),
          prisma.appointment.count({
            where: { doctorId: doc.id, status: 'CANCELLED' },
          }),
          prisma.queueToken.count({
            where: {
              doctorId: doc.id,
              createdAt: { gte: today },
            },
          }),
        ]);

        const revenue = completedAppointments * doc.consultationFee;

        return {
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          department: doc.department,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize,
          revenue,
        };
      })
    );

    const durationMs = Date.now() - start;

    return res.status(200).json(successResponse("Successfully fetched", {
      reportData: reportData,
      timeTakenMs: durationMs
    }))

  } catch (error) {
    return res.status(500).json(errorResponse("Failed to generate report"));
  }
});

module.exports = router;
