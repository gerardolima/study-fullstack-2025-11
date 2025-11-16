import {type FastifyInstance, type RouteShorthandOptions} from 'fastify'
import * as userService from './user.service.ts'
import {UsernameExistsError} from './user.error.ts'
import {type ZodTypeProvider} from 'fastify-type-provider-zod'
import {
  UserDeleteSchema,
  UserGetAllSchema,
  UserGetOneSchema,
  UserPatchSchema,
  UserPostSchema,
} from './user.model.dto.ts'

export const userRoutes = (app: FastifyInstance, _opt: RouteShorthandOptions) => {
  // GET /api/users
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: UserGetAllSchema,
    handler: (_req, reply) => {
      const res = userService.getAll()
      reply.send(res)
    },
  })

  // GET /api/users/:username
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:username',
    schema: UserGetOneSchema,
    handler: (req, reply) => {
      const {username} = req.params

      const res = userService.getByUsername(username)

      if (res) {
        reply.send(res)
      } else {
        reply.status(404).send({message: `User not found: '${username}'`})
      }
    },
  })

  // POST /api/users
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: UserPostSchema,
    handler: (req, reply) => {
      const {username, firstName, lastName} = req.body
      try {
        const res = userService.create({username, firstName, lastName})
        reply.status(201).send(res)
      } catch (err: unknown) {
        if (err instanceof UsernameExistsError) {
          reply.status(409).send({message: err.message})
        } else {
          throw new Error('Unhandled error', {cause: err})
        }
      }
    },
  })

  // PATCH /api/users/:username
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/:username',
    schema: UserPatchSchema,
    handler: (req, reply) => {
      const {username} = req.params as any
      const {firstName, lastName, status} = req.body as any

      const updatedUser = userService.update(username, {firstName, lastName, status})
      if (!updatedUser) {
        reply.status(404).send({message: `User not found: '${username}'`})
      } else {
        reply.status(200).send(updatedUser)
      }
    },
  })

  // DELETE /api/users/:id
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/:username',
    schema: UserDeleteSchema,
    handler: (req, reply) => {
      const {username} = req.params

      const deleted = userService.remove(username)

      if (deleted) {
        reply.status(204).send()
      } else {
        reply.status(404).send({message: `User not found: '${username}'`})
      }
    },
  })
}
