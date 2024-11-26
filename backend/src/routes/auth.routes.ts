import { Router } from 'express';
import { register, login, verifyEmail } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);

export default router;
