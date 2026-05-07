import { Router } from 'express';
import { editMessage, deleteMessage, uploadMedia } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authMiddleware);

router.patch('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/upload', upload.single('file'), uploadMedia);

export default router;
