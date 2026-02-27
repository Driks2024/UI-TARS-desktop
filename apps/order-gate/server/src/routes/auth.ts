import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRoutes = async (server: FastifyInstance) => {
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await server.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = server.jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.issues });
      }
      server.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  server.get('/me', { preHandler: [server.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await server.prisma.user.findUnique({
      where: { id: (request.user as any).id },
      select: { id: true, email: true, role: true, name: true },
    });
    return user;
  });
};
