const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validators/auth');
const { successResponse, errorResponse } = require('../utils/api-response');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const signAndSetCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '8h' });

  res.cookie('haqms_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  });
};

// Changes - 
// sending token as http only cookies instead of previous approch of sending token and storing in the local storage, which is vulnarable
// added validation to the inputs 
// used common response object 
// removed unnecessary data exposure 
// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, name, role } = req.validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json(errorResponse('User already exists with this email'));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'RECEPTIONIST',
      },
    });

    signAndSetCookie(res, user.id)

    return res.status(201).json(successResponse(
      "successfully registered!",
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    ));
  } catch (error) {
    res.status(500).json(errorResponse('Server error during registration'));
  }
});

// changes made - 
// added the middleware based on zod to chaeck the validation 
// used a common response object 
// removes unnecessary data exposure 
// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    signAndSetCookie(res, user.id)

    return res.status(200).json(successResponse(
      "successfully logged in!",
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    ));
  } catch (error) {
    return res.status(500).json(errorResponse("Internal Server Error!"))
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('haqms_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json(successResponse('Logged out'));
});


// changes - 
// Used common response objects 
// GET /api/auth/me
// Returns current user details based on JWT
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    res.status(200).json(successResponse("User exists", user))

  } catch (error) {
    res.status(500).json(errorResponse("Session expired!"));
  }
});

module.exports = router;
