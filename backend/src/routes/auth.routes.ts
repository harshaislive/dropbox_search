import { Router } from 'express';
import { register, login, verifyEmail, resendOTP, refreshToken } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/refresh-token', refreshToken);

export default router;
