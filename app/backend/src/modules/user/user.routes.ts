import {type FastifyInstance, type RouteShorthandOptions} from 'fastify'
import {type ZodTypeProvider} from 'fastify-type-provider-zod'
import {UsernameExistsError} from './user.error.ts'
import {
  UserDeleteSchema,
  UserGetAllSchema,
  UserGetOneSchema,
  UserPatchSchema,
  UserPostSchema,
} from './user.model.dto.ts'
import * as userService from './user.service.ts'

export const userRoutes = (app: FastifyInstance, _opt: RouteShorthandOptions) => {
  // /api/users
  // ----------------------------------------------------------------------------

  // GET: /api/users
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: UserGetAllSchema,
    handler: async (req, reply) => {
      const {pageCurrent, pageSize} = req.query
      const res = await userService.getAll(pageCurrent, pageSize)
      reply.send(res)
    },
  })

  // POST: /api/users
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: UserPostSchema,
    handler: async (req, reply) => {
      const {username, firstName, lastName} = req.body
      try {
        const res = await userService.create({username, firstName, lastName})
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

  // /api/users/:username
  // ----------------------------------------------------------------------------

  // GET: /api/users/:username
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:username',
    schema: UserGetOneSchema,
    handler: async (req, reply) => {
      const {username} = req.params

      const res = await userService.getByUsername(username)

      if (res) {
        reply.send(res)
      } else {
        reply.status(404).send({message: `User not found: '${username}'`})
      }
    },
  })

  // PATCH: /api/users/:username
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/:username',
    schema: UserPatchSchema,
    handler: async (req, reply) => {
      const {username} = req.params
      const {firstName, lastName} = req.body

      const updatedUser = await userService.updateUserDetails(username, {firstName, lastName})
      if (!updatedUser) {
        reply.status(404).send({message: `User not found: '${username}'`})
      } else {
        reply.status(200).send(updatedUser)
      }
    },
  })

  // DELETE: /api/users/:username
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/:username',
    schema: UserDeleteSchema,
    handler: async (req, reply) => {
      const {username} = req.params

      const deleted = await userService.remove(username)

      if (deleted) {
        reply.status(204).send()
      } else {
        reply.status(404).send({message: `User not found: '${username}'`})
      }
    },
  })

  /*

  // /api/users/:username/status
  // ----------------------------------------------------------------------------

  // PATCH: /api/users/:username/status
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/:username/status',
    schema: UserPatchSchema,
    handler: (req, reply) => {
      const {username} = req.params
      const {firstName, lastName, status} = req.body

      const updatedUser = userService.updateUserDetails(username, {firstName, lastName, status})
      if (!updatedUser) {
        reply.status(404).send({message: `User not found: '${username}'`})
      } else {
        reply.status(200).send(updatedUser)
      }
    },
  })
// */
}
