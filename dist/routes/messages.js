"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/conversations', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const conversations = await index_1.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        userType: true,
                        agent: {
                            select: {
                                businessName: true,
                                isVerified: true
                            }
                        }
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        userType: true,
                        agent: {
                            select: {
                                businessName: true,
                                isVerified: true
                            }
                        }
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const conversationsMap = new Map();
        conversations.forEach(message => {
            const otherUser = message.senderId === userId ? message.receiver : message.sender;
            const key = `${Math.min(message.senderId === userId ? userId : otherUser.id, message.senderId === userId ? otherUser.id : userId)}-${Math.max(message.senderId === userId ? userId : otherUser.id, message.senderId === userId ? otherUser.id : userId)}-${message.propertyId || 'general'}`;
            if (!conversationsMap.has(key)) {
                conversationsMap.set(key, {
                    id: key,
                    otherUser,
                    property: message.property,
                    lastMessage: message,
                    unreadCount: 0,
                    messages: []
                });
            }
            const conversation = conversationsMap.get(key);
            if (message.createdAt > conversation.lastMessage.createdAt) {
                conversation.lastMessage = message;
            }
            if (message.receiverId === userId && !message.isRead) {
                conversation.unreadCount++;
            }
            conversation.messages.push(message);
        });
        const conversationsList = Array.from(conversationsMap.values());
        res.json({
            message: 'Conversations retrieved successfully',
            conversations: conversationsList
        });
    }
    catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            error: 'Failed to get conversations',
            message: 'An error occurred while retrieving conversations'
        });
    }
});
router.get('/conversation/:otherUserId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { otherUserId } = req.params;
        const { propertyId, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            OR: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
            ]
        };
        if (propertyId) {
            where.propertyId = propertyId;
        }
        const [messages, total] = await Promise.all([
            index_1.prisma.message.findMany({
                where,
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    receiver: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    property: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limitNum
            }),
            index_1.prisma.message.count({ where })
        ]);
        await index_1.prisma.message.updateMany({
            where: {
                senderId: otherUserId,
                receiverId: userId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });
        res.json({
            message: 'Messages retrieved successfully',
            messages: messages.reverse(),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            error: 'Failed to get messages',
            message: 'An error occurred while retrieving messages'
        });
    }
});
router.post('/send', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { receiverId, content, propertyId } = req.body;
        if (!receiverId || !content) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Receiver ID and content are required'
            });
        }
        const receiver = await index_1.prisma.user.findUnique({
            where: { id: receiverId }
        });
        if (!receiver) {
            return res.status(404).json({
                error: 'Receiver not found',
                message: 'The specified receiver does not exist'
            });
        }
        if (propertyId) {
            const property = await index_1.prisma.property.findUnique({
                where: { id: propertyId }
            });
            if (!property) {
                return res.status(404).json({
                    error: 'Property not found',
                    message: 'The specified property does not exist'
                });
            }
        }
        const message = await index_1.prisma.message.create({
            data: {
                senderId: userId,
                receiverId,
                content,
                propertyId: propertyId || null
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });
        res.status(201).json({
            message: 'Message sent successfully',
            data: message
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            error: 'Failed to send message',
            message: 'An error occurred while sending message'
        });
    }
});
router.put('/:messageId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { messageId } = req.params;
        const message = await index_1.prisma.message.findUnique({
            where: { id: messageId }
        });
        if (!message) {
            return res.status(404).json({
                error: 'Message not found',
                message: 'The specified message does not exist'
            });
        }
        if (message.receiverId !== userId) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only mark your own received messages as read'
            });
        }
        await index_1.prisma.message.update({
            where: { id: messageId },
            data: {
                isRead: true
            }
        });
        res.json({
            message: 'Message marked as read'
        });
    }
    catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            error: 'Failed to mark message as read',
            message: 'An error occurred while updating message'
        });
    }
});
router.get('/unread-count', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const unreadCount = await index_1.prisma.message.count({
            where: {
                receiverId: userId,
                isRead: false
            }
        });
        res.json({
            message: 'Unread count retrieved successfully',
            unreadCount
        });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            error: 'Failed to get unread count',
            message: 'An error occurred while retrieving unread count'
        });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map