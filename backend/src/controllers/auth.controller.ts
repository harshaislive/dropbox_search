import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../entities/User';
import { generateToken, comparePasswords } from '../utils/auth';
import { generateOTP, validateOTP, sendOTPEmail } from '../utils/email';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username, email, and password are required' 
      });
    }

    // Validate email domain
    if (!email.endsWith('@beforest.co')) {
      return res.status(400).json({ 
        success: false,
        message: 'Only @beforest.co email addresses are allowed' 
      });
    }

    const userRepository = getRepository(User);

    // Check if username or email already exists
    const existingUser = await userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already exists' : 'Email already registered',
      });
    }

    // Create new user
    const user = userRepository.create({
      username,
      email,
      password,
    });

    // Hash password
    await user.hashPassword();

    // Save user (unverified)
    await userRepository.save(user);

    // Generate and send OTP
    const otp = generateOTP();
    await sendOTPEmail(email, otp, username);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      username,
      email,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Registration failed. Please try again.' 
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and OTP are required' 
      });
    }

    const isValid = validateOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP' 
      });
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    user.isVerified = true;
    await userRepository.save(user);

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Email verification failed. Please try again.' 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false,
        message: 'Please verify your email before logging in' 
      });
    }

    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.' 
    });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and username are required' 
      });
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { email, username } });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp, username);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to resend OTP. Please try again.' 
    });
  }
};
