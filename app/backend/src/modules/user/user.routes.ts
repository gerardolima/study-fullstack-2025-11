import {type FastifyInstance, type RouteShorthandOptions} from 'fastify'
import * as userService from './user.service.ts'
import {UsernameExistsError} from './user.error.ts'

export const userRoutes = (app: FastifyInstance, _opt: RouteShorthandOptions) => {
  // GET /api/users
  app.get('/', (_req, reply) => {
    const res = userService.getAll()
    return reply.send(res)
  })

  // GET /api/users/:username
  app.get('/:username', (req, reply) => {
    const {username} = req.params as any
    const res = userService.getByUsername(username)

    return res ? reply.send(res) : reply.status(404).send({message: `User not found: '${username}'`})
  })

  // POST /api/users
  app.post('/', (req, reply) => {
    const {username, firstName, lastName} = req.body as any
    try {
      const res = userService.create({username, firstName, lastName})
      return reply.status(201).send(res)
    } catch (err: unknown) {
      if (err instanceof UsernameExistsError) {
        return reply.status(409).send({message: err.message})
      }
      throw new Error('Unhandled error', {cause: err})
    }
  })

  // PATCH /api/users/:username
  app.patch('/:username', (req, reply) => {
    const {username} = req.params as any
    const {firstName, lastName, status} = req.body as any

    const updatedUser = userService.update(username, {firstName, lastName, status})
    if (!updatedUser) {
      return reply.status(404).send({message: `User not found: '${username}'`})
    }

    return reply.status(200).send(updatedUser)
  })

  // DELETE /api/users/:id
  app.delete('/:username', (req, reply) => {
    const {username} = req.params as any

    const deleted = userService.remove(username)

    if (deleted) {
      return reply.status(204).send()
    } else {
      return reply.status(404).send({message: `User not found: '${username}'`})
    }
  })
}
