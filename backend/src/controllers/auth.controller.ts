import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { generateToken, comparePasswords, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import { generateOTP, validateOTP, sendOTPEmail } from '../utils/email';

export const register = async (req: Request, res: Response): Promise<Response> => {
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

    const userRepository = AppDataSource.getRepository(User);

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

export const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
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

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Generate access token
    const accessToken = generateToken(user);

    // Handle remember me functionality
    if (rememberMe) {
      const refreshToken = generateRefreshToken(user);
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30); // 30 days

      // Save refresh token to user
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = refreshTokenExpiresAt;
      await userRepository.save(user);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: refreshTokenExpiresAt
      });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { refreshToken } });

    if (!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.id !== user.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateToken(user);

    return res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while refreshing token'
    });
  }
};

export const resendOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and username are required' 
      });
    }

    const userRepository = AppDataSource.getRepository(User);
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
