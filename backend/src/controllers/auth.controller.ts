import { Request, Response } from 'express';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTPEmail, validateOTP } from '../utils/email';

const userRepository = AppDataSource.getRepository(User);

// Register new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create unverified user
    const user = userRepository.create({
      email,
      username,
      password: hashedPassword,
      isVerified: false
    });
    await userRepository.save(user);

    // Send OTP email
    await sendOTPEmail(email, otp, username);

    return res.status(201).json({ message: 'Registration initiated. Please verify your email.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Error during registration' });
  }
};

// Verify email with OTP
export const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    // Validate OTP
    if (!validateOTP(email, otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Find and verify user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = true;
    await userRepository.save(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ message: 'Error during verification' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error during login' });
  }
};
