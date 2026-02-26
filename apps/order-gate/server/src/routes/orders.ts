import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const orderRoutes = async (server: FastifyInstance) => {
  // List Orders
  server.get('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      }
    });
    return orders;
  });

  // Get Order Details
  server.get<{ Params: { id: string } }>('/:id', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        stamps: true,
        evidences: true,
      }
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    return order;
  });

  // Download Stamped PDF
  server.get<{ Params: { id: string } }>('/:id/download/stamped', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const stamp = await prisma.stamp.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!stamp || !fs.existsSync(stamp.path)) {
      return reply.status(404).send({ error: 'Stamped PDF not found' });
    }

    const stream = fs.createReadStream(stamp.path);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="stamped_${id}.pdf"`);
    return reply.send(stream);
  });

  // Download Evidence PDF
  server.get<{ Params: { id: string } }>('/:id/download/evidence', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const evidence = await prisma.evidence.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!evidence || !fs.existsSync(evidence.path)) {
      return reply.status(404).send({ error: 'Evidence PDF not found' });
    }

    const stream = fs.createReadStream(evidence.path);
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="evidence_${id}.pdf"`);
    return reply.send(stream);
  });

  // Email to Self
  server.post<{ Params: { id: string } }>('/:id/email-to-self', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const user = (request.user as any);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        stamps: true,
        evidences: true,
      }
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const stamp = order.stamps.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const evidence = order.evidences.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    const attachments = [];
    if (stamp && fs.existsSync(stamp.path)) {
      attachments.push({ filename: `Stamped_Order_${order.fileHash.substring(0,8)}.pdf`, path: stamp.path });
    }
    if (evidence && fs.existsSync(evidence.path)) {
      attachments.push({ filename: `Evidence_Report_${order.fileHash.substring(0,8)}.pdf`, path: evidence.path });
    }

    const { sendOrderEmail } = await import('../services/mail-service');

    await sendOrderEmail(
      user.email,
      `[Order Gate] Order ${order.originalFilename} - ${order.status}`,
      `
        <h1>Order Status Update</h1>
        <p>Your order <strong>${order.originalFilename}</strong> has been processed.</p>
        <p>Status: <strong>${order.status}</strong></p>
        <p>Order ID: ${order.id}</p>
        <p>Please find attached documents.</p>
      `,
      attachments
    );

    return { success: true, message: 'Email sent successfully' };
  });
};
