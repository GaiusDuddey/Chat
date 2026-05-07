import { Router } from 'express';
import { getMe, updateMe, searchUsers, getUserById } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.get('/search', searchUsers);
router.get('/:id', getUserById);

export default router;
