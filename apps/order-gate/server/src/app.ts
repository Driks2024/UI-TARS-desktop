import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'path';
import { authRoutes } from './routes/auth';
import { uploadRoutes } from './routes/upload';
import { orderRoutes } from './routes/orders';
import { adminRoutes } from './routes/admin';
import { PrismaClient } from '@prisma/client';

// Extend FastifyInstance type
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: PrismaClient;
  }
}

const prisma = new PrismaClient();

const server: FastifyInstance = Fastify({
  logger: true,
  bodyLimit: 30 * 1024 * 1024, // 30MB
});

server.decorate('prisma', prisma);

server.register(cors, {
  origin: '*',
});

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret', // Fallback for dev only
});

server.register(multipart);

// Static files for uploads
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
import fs from 'fs';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

server.register(staticPlugin, {
  root: uploadsDir,
  prefix: '/uploads/',
});

server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

server.register(authRoutes, { prefix: '/api/auth' });
server.register(uploadRoutes, { prefix: '/api/upload' });
server.register(orderRoutes, { prefix: '/api/orders' });
server.register(adminRoutes, { prefix: '/api/admin' });

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://0.0.0.0:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default server;
