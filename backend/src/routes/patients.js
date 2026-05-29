const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnlyLegacy, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { patientSchema } = require('../validators/patient');
const { successResponse, errorResponse } = require('../utils/api-response');

const router = express.Router();
const prisma = new PrismaClient();

// changes -
//  added authorization only allowed for receptionist and admin
// GET /api/patients
// Get all patients with search, filtering, and INEFICIENT IN-MEMORY PAGINATION
router.get('/', authenticate, authorize('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { search, gender, page: pageParam, limit: limitParam } = req.query;

    const page = Math.max(1, parseInt(pageParam) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitParam) || 10));
    const skip = (page - 1) * limit;

    const where = {};

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phoneNumber: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    const [totalPatients, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          age: true,
          gender: true,
          medicalHistory: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalPatients / limit);

    return res.status(200).json(successResponse("Successfully fetched",
      {
        patients,
        pagination: {
          page,
          limit,
          totalPatients,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      }
    ))

  } catch (error) {
    return res.status(500).json(errorResponse("failed to fetch patients"))
  }
});


//! need attention
// GET /api/patients/:id
// Get patient details by ID. Notice N+1 issue could be placed here or in appointments,
// but let's make it fetch the patient with their appointments and tokens.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// changes -
// added validation 
// added authorization 
// used common response object 
// POST /api/patients (Register patient)
router.post('/', authenticate, authorize('RECEPTIONIST', 'ADMIN'), validate(patientSchema), async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      age,
      gender,
      medicalHistory
    } = req.validatedData;

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        age: age,
        gender,
        medicalHistory: medicalHistory || null, // Can be null, will crash UI without optional chaining
      },
    });

    res.status(201).json(successResponse("Successfully created patient!", patient));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to register patient'));
  }
});


// changes - 
// added authrization, only admin can delete pppatient now 
// used coomon res obj 
// DELETE /api/patients/:id
// SECURITY BUG: The route relies on authorizeAdminOnlyLegacy, which has the bypassed admin validation check!
// This allows any receptionist or doctor to delete a patient.
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json(errorResponse('Patient not found'));
    }
    await prisma.patient.delete({ where: { id } });
    return res.status(200).json(successResponse(`Successfully deleted patient ${patient.name}`, {}));
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to delete patient'));
  }
});

module.exports = router;
