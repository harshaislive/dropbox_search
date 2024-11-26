import { Request, Response } from 'express';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';
import { generateOTP, sendOTPEmail } from '../utils/email';
import { activeOTPs } from '../utils/email';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user exists
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ 
      where: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Send OTP
    const otp = generateOTP();
    try {
      await sendOTPEmail(email, otp, username);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (unverified)
    const user = userRepository.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false
    });

    await userRepository.save(user);

    return res.status(201).json({
      success: true,
      message: 'Registration initiated. Please verify your email.',
      email
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Verify email with OTP
export const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    // Check OTP
    const storedOTP = activeOTPs.get(email);
    if (!storedOTP || storedOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (storedOTP.expiresAt < Date.now()) {
      activeOTPs.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // Mark user as verified
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isVerified = true;
    await userRepository.save(user);
    activeOTPs.delete(email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or unverified account'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};
