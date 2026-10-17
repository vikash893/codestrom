import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env.js';
import { User } from '../models/User.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required for WebSocket connection.'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        return next(new Error('User not found.'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized socket connection.'));
    }
  });

  io.on('connection', (socket) => {
    // User joins their personal room for private notifications
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);

    // Join role room (e.g. 'role:doctor', 'role:hospital', 'role:admin')
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Join secure consultation room
    socket.on('join_consultation', ({ consultationId }) => {
      if (consultationId) {
        socket.join(`consultation:${consultationId}`);
      }
    });

    // Leave consultation room
    socket.on('leave_consultation', ({ consultationId }) => {
      if (consultationId) {
        socket.leave(`consultation:${consultationId}`);
      }
    });

    // Consultation live messaging
    socket.on('send_consultation_message', ({ consultationId, text }) => {
      if (consultationId && text) {
        io.to(`consultation:${consultationId}`).emit('consultation_message', {
          senderId: socket.user._id,
          senderRole: socket.user.role,
          text,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => ioInstance;

export const emitToUser = (userId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
};

export const emitToRole = (role, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`role:${role}`).emit(event, payload);
  }
};

export const emitToConsultation = (consultationId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`consultation:${consultationId}`).emit(event, payload);
  }
};

