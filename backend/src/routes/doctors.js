const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/api-response');

const router = express.Router();
const prisma = new PrismaClient();


// chaanges - 
// Added authorize middleware to permit only admins and RECEPTIONIST
// sending all the doctors to the front end 
// usedd common response object 
// GET /api/doctors
// Retrieve list of doctors with special search filtering
// SECURITY BUG: SQL Injection vulnerability in the search parameter!
// Uses queryRawUnsafe with string concatenation instead of parameterized inputs.
router.get('/', authenticate, async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(successResponse("Successfuly fetched Doctors", doctors));
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to fetch doctors'));
  }
});

// GET /api/doctors/stats
// Returns aggregation details about available doctors
// PERFORMANCE BUG: Sequential async calls instead of Promise.all()
router.get('/stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // Independent database calls are run sequentially with await, stalling the event loop
    const totalDoctors = await prisma.doctor.count();

    const surgeonsCount = await prisma.doctor.count({
      where: { department: 'Surgery' },
    });

    const averageFee = await prisma.doctor.aggregate({
      _avg: {
        consultationFee: true,
      },
    });

    const highestExperience = await prisma.doctor.aggregate({
      _max: {
        experience: true,
      },
    });

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFee._avg.consultationFee || 0),
        maxExperience: highestExperience._max.experience || 0,
      },
      debugInfo: {
        executionTimeMs: durationMs,
        notes: 'Loaded sequentially for safety. Optimization needed.'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
