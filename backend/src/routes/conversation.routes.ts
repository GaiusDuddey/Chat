import { Router } from 'express';
import {
  getConversations,
  createConversation,
  getConversationById,
  updateConversation,
  addMember,
  removeMember,
} from '../controllers/conversation.controller';
import { getMessages, sendMessage } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);
router.patch('/:id', updateConversation);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

// Messages nested under conversations
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

export default router;
