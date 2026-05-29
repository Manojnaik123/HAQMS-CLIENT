const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── USERS ──
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {},
    create: { email: 'admin@haqms.com', password: hashedPassword, name: 'System Admin', role: 'ADMIN' },
  });

  const receptionUser = await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {},
    create: { email: 'reception1@haqms.com', password: hashedPassword, name: 'Reception One', role: 'RECEPTIONIST' },
  });

  const doctorUser1 = await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {},
    create: { email: 'doctor1@haqms.com', password: hashedPassword, name: 'Dr. John Smith', role: 'DOCTOR' },
  });

  const doctorUser2 = await prisma.user.upsert({
    where: { email: 'doctor2@haqms.com' },
    update: {},
    create: { email: 'doctor2@haqms.com', password: hashedPassword, name: 'Dr. Sarah Lane', role: 'DOCTOR' },
  });

  console.log('Users created');

  // ── DOCTORS ──
  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctorUser1.id },
    update: {},
    create: {
      name: 'Dr. John Smith',
      specialization: 'Cardiology',
      department: 'Cardiology',
      consultationFee: 500,
      experience: 10,
      userId: doctorUser1.id,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctorUser2.id },
    update: {},
    create: {
      name: 'Dr. Sarah Lane',
      specialization: 'Neurology',
      department: 'Neurology',
      consultationFee: 700,
      experience: 8,
      userId: doctorUser2.id,
    },
  });

  console.log('Doctors created');

  // ── PATIENTS ──
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'patient-clark-kent' },
      update: {},
      create: {
        id: 'patient-clark-kent',
        name: 'Clark Kent',
        email: 'clark@dailyplanet.com',
        phoneNumber: '9876543210',
        age: 35,
        gender: 'Male',
        medicalHistory: null, // Intentionally null — triggers frontend crash bug
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-bruce-wayne' },
      update: {},
      create: {
        id: 'patient-bruce-wayne',
        name: 'Bruce Wayne',
        email: 'bruce@wayneenterprises.com',
        phoneNumber: '9123456780',
        age: 40,
        gender: 'Male',
        medicalHistory: null, // Intentionally null — triggers frontend crash bug
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-diana-prince' },
      update: {},
      create: {
        id: 'patient-diana-prince',
        name: 'Diana Prince',
        email: 'diana@themyscira.com',
        phoneNumber: '9988776655',
        age: 30,
        gender: 'Female',
        medicalHistory: 'Seasonal allergies. No known drug allergies.',
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-peter-parker' },
      update: {},
      create: {
        id: 'patient-peter-parker',
        name: 'Peter Parker',
        email: 'peter@dailybugle.com',
        phoneNumber: '9871234560',
        age: 25,
        gender: 'Male',
        medicalHistory: 'Mild asthma. Uses inhaler occasionally.',
      },
    }),
  ]);

  console.log('Patients created');

  // ── APPOINTMENTS ──
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const appt1 = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctor1.id,
      appointmentDate: tomorrow,
      reason: 'Routine cardiac checkup',
      status: 'PENDING',
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patients[2].id,
      doctorId: doctor2.id,
      appointmentDate: tomorrow,
      reason: 'Headache and dizziness',
      status: 'PENDING',
    },
  });

  console.log('Appointments created');

  // ── QUEUE TOKENS ──
  await prisma.queueToken.create({
    data: {
      tokenNumber: 1,
      patientId: patients[0].id,
      doctorId: doctor1.id,
      appointmentId: appt1.id,
      status: 'WAITING',
    },
  });

  await prisma.queueToken.create({
    data: {
      tokenNumber: 2,
      patientId: patients[1].id,
      doctorId: doctor1.id,
      appointmentId: null,
      status: 'WAITING',
    },
  });

  await prisma.queueToken.create({
    data: {
      tokenNumber: 1,
      patientId: patients[2].id,
      doctorId: doctor2.id,
      appointmentId: appt2.id,
      status: 'WAITING',
    },
  });

  console.log('Queue tokens created');
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });