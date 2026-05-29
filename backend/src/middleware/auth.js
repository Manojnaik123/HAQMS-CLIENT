const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/api-response');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-secret-key-12345!!!';


// changes - 
// now using cookies based authentication, safer than previous way were token was directly stored in the local storage 
// using common response object 
const authenticate = (req, res, next) => {
  let token = null;

  // Priority 1: HttpOnly cookie (browser clients)
  if (req.cookies && req.cookies.haqms_token) {
    token = req.cookies.haqms_token;
  }
  // Priority 2: Authorization header (API clients / Postman)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json(errorResponse('Not authenticated. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(errorResponse('Session expired. Please log in again.'));
    }
    return res.status(401).json(errorResponse('Invalid token. Please log in again.'));
  }
};

// changes - 
// added this middleware to permit based on role 
//  used common response object 
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      // fetch fresh user from DB
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id
        },
        select: {
          id: true,
          role: true,
          name: true,
          email: true
        }
      });

      if (!user) {
        return res.status(401).json(errorResponse('User not found'));
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user.role)
      ) {
        return res.status(403).json(errorResponse('Forbidden'));
      }

      req.user = user;

      next();

    } catch (error) {
      return res.status(500).json(errorResponse('Authorization failed'));
    }
  };
};

// MISSING AUTHORIZATION CHECK: This middleware is meant for Admin actions but is empty
// or fails to check the role, allowing any authenticated user (e.g. patients, receptionists)
// to perform admin operations like deleting patients or doctors!
const authorizeAdminOnlyLegacy = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  // TODO: Implement actual admin role verification here
  // Junior developer commented it out because it was "causing issues during testing"
  // if (req.user.role !== 'ADMIN') {
  //   return res.status(403).json({ error: 'Access denied. Admin only.' });
  // }
  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdminOnlyLegacy,
};
