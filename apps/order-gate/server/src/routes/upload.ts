import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';
import { extractTextFromPdf, parseOrderData, OrderData } from '../services/pdf-parser';
import { validateOrder } from '../services/policy-engine';
import { stampPdf } from '../services/pdf-stamper';
import { generateEvidencePdf } from '../services/evidence-generator';

const pump = util.promisify(pipeline);
const prisma = new PrismaClient();

// Ensure uploads dir
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const uploadRoutes = async (server: FastifyInstance) => {
  server.post('/', { preHandler: [server.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const originalFilename = data.filename;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}-${originalFilename}`;
      const filePath = path.join(uploadsDir, filename);

      await pump(data.file, fs.createWriteStream(filePath));

      // Calculate hash
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const fileHash = hashSum.digest('hex');

      // Check duplicate
      const existingOrder = await prisma.order.findUnique({
        where: { fileHash },
      });

      if (existingOrder) {
        // Return existing order info
        return reply.send({
            message: 'Duplicate file detected',
            order: existingOrder,
            validationResult: JSON.parse(existingOrder.validationResult || '{}')
        });
      }

      // Process PDF
      let text = '';
      try {
        text = await extractTextFromPdf(fileBuffer);
      } catch (e) {
        // If fail, just use empty text
        console.error('Text extraction failed:', e);
      }

      const orderData: OrderData = parseOrderData(text);

      // Basic validation if empty
      if (orderData.items.length === 0 && orderData.total === 0) {
          // Mark as incomplete/warning
          orderData.warnings = ['Could not extract order details. Manual review required.'];
      }

      // Validate Rules
      const validationResult = await validateOrder(orderData);

      // Save Order
      const userId = (request.user as any)?.id; // Auth middleware sets this

      // Create initial order record
      const order = await prisma.order.create({
        data: {
          originalFilename,
          fileHash,
          filePath,
          status: validationResult.status,
          extractedData: JSON.stringify(orderData),
          normalizedData: JSON.stringify(orderData),
          validationResult: JSON.stringify(validationResult),
          userId: userId || 'unknown', // Fallback
        },
      });

      // Generate Stamp
      const stampId = crypto.randomUUID();
      let stampedPdfPath = '';
      try {
        stampedPdfPath = await stampPdf(filePath, validationResult.status, stampId, fileHash);

        await prisma.stamp.create({
          data: {
            id: stampId,
            status: validationResult.status,
            hash: crypto.createHash('sha256').update(fs.readFileSync(stampedPdfPath)).digest('hex'),
            path: stampedPdfPath,
            orderId: order.id,
          }
        });
      } catch (err) {
        console.error('Failed to stamp PDF:', err);
      }

      // Generate Evidence if Rejected or Exception
      let evidencePdfPath = '';
      if (validationResult.status !== 'APPROVED') {
        try {
           evidencePdfPath = await generateEvidencePdf(validationResult, orderData.orderNumber || 'UNKNOWN', uploadsDir);

           await prisma.evidence.create({
             data: {
               path: evidencePdfPath,
               hash: crypto.createHash('sha256').update(fs.readFileSync(evidencePdfPath)).digest('hex'),
               orderId: order.id,
             }
           });
        } catch (err) {
           console.error('Failed to generate evidence PDF:', err);
        }
      }

      return reply.send({
        message: 'File processed successfully',
        order,
        validationResult,
        stampedPdfPath,
        evidencePdfPath
      });

    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: 'Failed to process file' });
    }
  });
};
