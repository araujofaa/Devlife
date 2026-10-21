import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
fastify.get('/', async (request, reply) => {
return {
success: true,
data: {
status: 'ok',
timestamp: new Date().toISOString(),
},
};
});
}
