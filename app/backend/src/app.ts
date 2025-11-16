import Fastify from 'fastify'
import {userRoutes} from './modules/user/user.routes.ts'
import {serializerCompiler, validatorCompiler} from 'fastify-type-provider-zod'

const app = Fastify({logger: true})

// enables payload validation and response serialization using Zod
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

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
