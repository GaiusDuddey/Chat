import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { parsePaginationParams } from '../utils/pagination';

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params.id as string;
    const userId = req.user!.userId;
    const pagination = parsePaginationParams(req.query as any);

    const result = await messageService.getMessages(id, userId, pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.param.id as strings;
    const userId = req.user!.userId;
    const { content, type, mediaUrl, replyToId } = req.body;

    const message = await messageService.sendMessage(
      id,
      userId,
      content,
      type,
      mediaUrl,
      replyToId
    );

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = .id as string;
    const userId = req.user!.userId;
    const { content } = req.body;

    const message = await messageService.editMessage(id, userId, content);
    res.json(message);
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params.id as string;
    const userId = req.user!.userId;

    await messageService.deleteMessage(id, userId);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};

export const uploadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // In production, upload to S3 and return the URL
    // For dev, use local path
    const mediaUrl = `/uploads/${req.file.filename}`;
    res.json({ mediaUrl });
  } catch (error) {
    next(error);
  }
};
