import * as assert from 'node:assert/strict'
import {after, afterEach, before, beforeEach, describe, it} from 'node:test'
import Fastify, {type FastifyInstance} from 'fastify'
import {serializerCompiler, validatorCompiler, type ZodTypeProvider} from 'fastify-type-provider-zod'
import Chance from 'chance'
import {userRoutes} from './user.routes.ts'
import * as userRepository from './user.repository.ts'

const chance = new Chance()

describe('/api/users (user.routes)', () => {
  let app: FastifyInstance

  before(async () => {
    app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    await app.register(userRoutes, {prefix: '/api/users'})
    await app.ready()
  })

  beforeEach(() => {
    userRepository.clearAll()
  })

  after(async () => {
    await app.close()
  })

  describe('GET: /api/users', () => {
    it('returns 200 with empty array when no users exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
      })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json(), [])
    })

    it('returns 200 with all users', async () => {
      const user1 = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })
      const user2 = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
      })

      assert.equal(response.statusCode, 200)
      const users = response.json()
      assert.equal(users.length, 2)
      assert.ok(users.some((u: any) => u.username === user1.username))
      assert.ok(users.some((u: any) => u.username === user2.username))
    })
  })

  describe('GET: /api/users/:username', () => {
    it('returns 200 with user when user exists', async () => {
      const user = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${user.username}`,
      })

      assert.equal(response.statusCode, 200)
      const result = response.json()
      assert.equal(result.username, user.username)
      assert.equal(result.firstName, user.firstName)
      assert.equal(result.lastName, user.lastName)
    })

    it('returns 404 when user does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/nonexistent',
      })

      assert.equal(response.statusCode, 404)
      const result = response.json()
      assert.equal(result.message, "User not found: 'nonexistent'")
    })
  })

  describe('POST: /api/users', () => {
    it('creates a new user and returns 201', async () => {
      const payload = {
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload,
      })

      assert.equal(response.statusCode, 201)
      const user = response.json()
      assert.equal(user.username, payload.username)
      assert.equal(user.firstName, payload.firstName)
      assert.equal(user.lastName, payload.lastName)
      assert.equal(user.status, 'active')
      assert.equal(user.loginsCounter, 0)
      assert.ok(user.creationTime)
      assert.ok(user.lastUpdateTime)
    })

    it('persists the created user in repository', async () => {
      const payload = {
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      }

      await app.inject({
        method: 'POST',
        url: '/api/users',
        payload,
      })

      const foundUser = userRepository.getByUsername(payload.username)
      assert.ok(foundUser)
      assert.equal(foundUser.username, payload.username)
    })

    it('returns 409 when username already exists', async () => {
      userRepository.create({
        username: 'existinguser',
        firstName: chance.first(),
        lastName: chance.last(),
      })
      const payload = {
        username: 'existinguser',
        firstName: chance.first(),
        lastName: chance.last(),
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload,
      })

      assert.equal(response.statusCode, 409)
      const result = response.json()
      assert.ok(result.message.includes('existinguser'))
    })

    it('returns 400 when payload is invalid', async () => {
      const payload = {
        username: chance.word(),
        // missing firstName and lastName
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        payload,
      })

      assert.equal(response.statusCode, 400)
    })
  })

  describe.only('PATCH: /api/users/:username', () => {
    it('updates user firstName and returns 200', async () => {
      const initial = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/users/${initial.username}`,
        payload: {
          firstName: 'Jane',
        },
      })

      assert.equal(response.statusCode, 200)
      const user = response.json()
      assert.equal(user.firstName, 'Jane')
      assert.equal(user.lastName, initial.lastName)
    })

    it('updates user lastName and returns 200', async () => {
      const initial = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/users/${initial.username}`,
        payload: {
          lastName: 'Smith',
        },
      })

      assert.equal(response.statusCode, 200)
      const user = response.json()
      assert.equal(user.firstName, initial.firstName)
      assert.equal(user.lastName, 'Smith')
    })

    it('updates user status and returns 200', async () => {
      const initial = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/users/${initial.username}`,
        payload: {
          status: 'inactive',
        },
      })

      assert.equal(response.statusCode, 200)
      const user = response.json()
      assert.equal(user.status, 'inactive')
    })

    it('updates multiple fields at once', async () => {
      const initial = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/users/${initial.username}`,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          status: 'inactive',
        },
      })

      assert.equal(response.statusCode, 200)
      const user = response.json()
      assert.equal(user.firstName, 'Jane')
      assert.equal(user.lastName, 'Smith')
      assert.equal(user.status, 'inactive')
    })

    it('persists the updated user in repository', async () => {
      const initial = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      await app.inject({
        method: 'PATCH',
        url: `/api/users/${initial.username}`,
        payload: {
          firstName: 'Jane',
        },
      })

      const foundUser = userRepository.getByUsername(initial.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Jane')
    })

    it('returns 404 when user does not exist', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/nonexistent',
        payload: {
          firstName: 'Jane',
        },
      })

      assert.equal(response.statusCode, 404)
      const result = response.json()
      assert.equal(result.message, "User not found: 'nonexistent'")
    })

    it('returns 400 when status value is invalid', async () => {
      userRepository.create({
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
      })

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/testuser',
        payload: {
          status: 'invalid-status',
        },
      })

      assert.equal(response.statusCode, 400)
    })
  })

  describe('DELETE: /api/users/:username', () => {
    it('deletes user and returns 204', async () => {
      const user = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/users/${user.username}`,
      })

      assert.equal(response.statusCode, 204)
      assert.equal(response.body, '')
    })

    it('removes the user from repository', async () => {
      const user = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      await app.inject({
        method: 'DELETE',
        url: `/api/users/${user.username}`,
      })

      const foundUser = userRepository.getByUsername(user.username)
      assert.equal(foundUser, undefined)
    })

    it('returns 404 when user does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/users/nonexistent',
      })

      assert.equal(response.statusCode, 404)
      const result = response.json()
      assert.equal(result.message, "User not found: 'nonexistent'")
    })

    it('does not affect other users', async () => {
      const user1 = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })
      const user2 = userRepository.create({
        username: chance.word(),
        firstName: chance.first(),
        lastName: chance.last(),
      })

      await app.inject({
        method: 'DELETE',
        url: '/api/users/user1',
      })

      const user2Again = userRepository.getByUsername(user2.username)
      assert.ok(user2Again)
      assert.deepEqual(user2Again, user2)
    })
  })
})
