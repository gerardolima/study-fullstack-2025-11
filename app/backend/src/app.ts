import Fastify from 'fastify'
import {userRoutes} from './modules/user/user.routes.ts'

const app = Fastify({logger: true})

// register routes (prefix: /api)
app.register(userRoutes, {prefix: '/api/users'})

// start server
try {
  const port = parseInt(process.env.PORT || '3000', 10)
  await app.listen({port, host: '0.0.0.0'})
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
