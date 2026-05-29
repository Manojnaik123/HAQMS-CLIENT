const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/api-response');

const router = express.Router();
const prisma = new PrismaClient();

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

// GET /api/appointments
router.get('/', authenticate, authorize('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      include: {
        patient: {
          select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    return res.status(200).json(successResponse('Successfully retrieved appointments', {
      count: appointments.length,
      appointments,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to retrieve appointments'));
  }
});

// POST /api/appointments
router.post('/', authenticate, authorize('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json(errorResponse('Patient, Doctor, and Appointment Date are required.'));
    }

    const appDate = new Date(appointmentDate);

    if (isNaN(appDate.getTime())) {
      return res.status(400).json(errorResponse('Invalid appointment date format.'));
    }

    const startOfWindow = new Date(appDate.getTime() - 30 * 60 * 1000);
    const endOfWindow = new Date(appDate.getTime() + 30 * 60 * 1000); 

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: { gte: startOfWindow, lte: endOfWindow },
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      return res.status(409).json(errorResponse('Doctor already has an appointment within this 1-hour slot.'));
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    return res.status(201).json(successResponse('Appointment booked successfully', appointment));
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to book appointment'));
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', authenticate, authorize('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json(errorResponse('Status is required.'));
    }

    // FIX: validate status is a known value
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json(errorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`));
    }

    // FIX: check the record exists before updating
    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json(errorResponse('Appointment not found.'));
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.status(200).json(successResponse('Appointment status updated successfully', updated));
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to update appointment'));
  }
});

module.exports = router;