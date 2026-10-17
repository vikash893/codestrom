import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { PatientProfile } from '../models/PatientProfile.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const register = async (req, res, next) => {
  try {
    const { phone, email, password, fullName, role = 'patient', preferredLanguage = 'en' } = req.body;

    if (!phone || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, password, and full name are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Role safety: ordinary registration cannot assign admin role
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered.',
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists.',
      });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      phone,
      email: email || undefined,
      passwordHash,
      role,
      status: 'active',
      isVerified: role === 'patient', // Providers require admin verification, patients verified by phone
    });

    let profile = null;
    if (role === 'patient') {
      profile = await PatientProfile.create({
        userId: user._id,
        fullName,
        preferredLanguage,
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phoneOrEmail, password } = req.body;

    if (!phoneOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone/email and password are required.',
      });
    }

    const user = await User.findOne({
      $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone/email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone/email or password.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.',
      });
    }

    const token = generateToken(user);

    let profile = null;
    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: req.user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        phone: req.user.phone,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};
