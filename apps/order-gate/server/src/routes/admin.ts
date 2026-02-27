import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const priceSchema = z.object({
  groupName: z.string().optional(),
  prefix: z.string().optional(),
  sku: z.string().optional(),
  minPrice: z.number().positive(),
  fullPrice: z.number().positive().optional(),
});

export const adminRoutes = async (server: FastifyInstance) => {
  // Check Admin Role Middleware
  server.addHook('preHandler', async (request: any, reply) => {
    if (request.user.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Access denied: Admin only' });
    }
  });

  // List Prices
  server.get('/prices', async (request: FastifyRequest, reply: FastifyReply) => {
    const prices = await prisma.priceCatalog.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return prices;
  });

  // Create Price Rule
  server.post('/prices', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = priceSchema.parse(request.body);
      const price = await prisma.priceCatalog.create({ data });
      return price;
    } catch (err) {
      reply.status(400).send(err);
    }
  });

  // Update Price Rule
  server.put<{ Params: { id: string } }>('/prices/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = priceSchema.parse(request.body);
      const price = await prisma.priceCatalog.update({
        where: { id },
        data,
      });
      return price;
    } catch (err) {
      reply.status(400).send(err);
    }
  });

  // Delete Price Rule
  server.delete<{ Params: { id: string } }>('/prices/:id', async (request, reply) => {
    const { id } = request.params;
    await prisma.priceCatalog.delete({ where: { id } });
    return { success: true };
  });

  // Override Order Rejection
  server.post<{ Params: { id: string }, Body: { justification: string } }>('/orders/:id/override', async (request, reply) => {
    const { id } = request.params;
    const { justification } = request.body;

    if (!justification) {
      return reply.status(400).send({ error: 'Justification required' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Order not found' });

    // Update status to EXCEPTION
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'EXCEPTION',
        // Append justification to validation result or audit log?
        // Let's create an AuditLog
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'OVERRIDE',
        details: `Order overridden by Admin. Justification: ${justification}`,
        userId: (request.user as any).id,
      },
    });

    // Re-stamp as EXCEPTION
    // We need to import stamping logic here or trigger it separately.
    // Ideally, re-trigger stamping service.

    // For MVP, simplified: just updating status.
    // UI can request re-download which should ideally check status and re-stamp on fly or re-generate.
    // Current `pdf-stamper` saves to disk. We should re-run it.

    const { stampPdf } = await import('../services/pdf-stamper');
    const crypto = await import('crypto');
    const fs = await import('fs');

    try {
        const stampId = crypto.randomUUID();
        // Re-stamp original file
        const stampedPath = await stampPdf(order.filePath, 'EXCEPTION', stampId, order.fileHash);

        await prisma.stamp.create({
            data: {
                id: stampId,
                status: 'EXCEPTION',
                hash: crypto.createHash('sha256').update(fs.readFileSync(stampedPath)).digest('hex'),
                path: stampedPath,
                orderId: order.id
            }
        });
    } catch (e) {
        console.error('Failed to restamp', e);
    }

    return updatedOrder;
  });
};
