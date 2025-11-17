import * as assert from 'node:assert/strict'
import {after, before, beforeEach, describe, it} from 'node:test'
import Chance from 'chance'
import Fastify, {type FastifyInstance} from 'fastify'
import {serializerCompiler, validatorCompiler} from 'fastify-type-provider-zod'
import {z} from 'zod'
import {
  UserDeleteSchema,
  UserGetAllSchema,
  UserGetOneSchema,
  UserPatchSchema,
  UserPostSchema,
} from './user.model.dto.ts'
import * as userRepository from './user.repository.ts'
import {userRoutes} from './user.routes.ts'

const chance = new Chance()

describe('user.routes', () => {
  let app: FastifyInstance

  before(async () => {
    app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    await app.register(userRoutes, {prefix: '/api/users'})
    await app.ready()
  })

  beforeEach(async () => {
    await userRepository.clearAll()
  })

  after(async () => {
    await app.close()
  })

  describe('/api/users', () => {
    describe('GET: /api/users', () => {
      it('returns 200 with empty array when no users exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/users',
        })

        assert.equal(response.statusCode, 200)

        const data = response.json<z.infer<(typeof UserGetAllSchema.response)[200]>>()
        assert.deepEqual(data, {
          list: [],
          pageCurrent: 1,
          pageSize: 6,
          pageCount: 0,
        })
      })

      it('returns 200 with all users', async () => {
        const user1 = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })
        const user2 = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/users',
        })

        assert.equal(response.statusCode, 200)

        const data = response.json<z.infer<(typeof UserGetAllSchema.response)[200]>>()
        assert.equal(data.list.length, 2)
        assert.ok(data.list.some((usr) => usr.username === user1.username))
        assert.ok(data.list.some((usr) => usr.username === user2.username))
      })

      it('respects pagination query parameters', async () => {
        let pageCurrent = 0
        const pageSize = 3
        await Promise.all([
          userRepository.create({username: 'user1', firstName: 'A', lastName: 'User'}),
          userRepository.create({username: 'user2', firstName: 'B', lastName: 'User'}),
          userRepository.create({username: 'user3', firstName: 'C', lastName: 'User'}),
          userRepository.create({username: 'user4', firstName: 'D', lastName: 'User'}),
          userRepository.create({username: 'user5', firstName: 'E', lastName: 'User'}),
        ])

        pageCurrent = 1
        const response1 = await app.inject({
          method: 'GET',
          url: `/api/users?pageSize=${pageSize}&pageCurrent=${pageCurrent}`,
        })

        assert.equal(response1.statusCode, 200)
        const data1 = response1.json<z.infer<(typeof UserGetAllSchema.response)[200]>>()
        assert.equal(data1.list.length, 3)

        assert.partialDeepStrictEqual(data1, {
          pageCurrent,
          pageSize,
          pageCount: 2,
        })

        pageCurrent = 2
        const response2 = await app.inject({
          method: 'GET',
          url: `/api/users?pageSize=${pageSize}&pageCurrent=${pageCurrent}`,
        })

        assert.equal(response2.statusCode, 200)
        const data2 = response2.json<z.infer<(typeof UserGetAllSchema.response)[200]>>()
        assert.equal(data2.list.length, 2)

        assert.partialDeepStrictEqual(data2, {
          pageCurrent,
          pageSize,
          pageCount: 2,
        })
      })

      it('returns 400 when pagination parameters are invalid', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/users?pageCurrent=0&pageSize=10',
        })

        assert.equal(response.statusCode, 400)
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

        const user = response.json<z.infer<(typeof UserPostSchema.response)[201]>>()
        assert.partialDeepStrictEqual(user, {
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          status: 'active',
          loginsCounter: 0,
        })
        assert.equal(typeof user.creationTime, 'string')
        assert.equal(typeof user.lastUpdateTime, 'string')
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

        const foundUser = await userRepository.getByUsername(payload.username)
        assert.ok(foundUser)
        assert.equal(foundUser.username, payload.username)
      })

      it('returns 409 when username already exists', async () => {
        const username = chance.word()
        await userRepository.create({
          username: username,
          firstName: chance.first(),
          lastName: chance.last(),
        })
        const payload = {
          username: username,
          firstName: chance.first(),
          lastName: chance.last(),
        }

        const response = await app.inject({
          method: 'POST',
          url: '/api/users',
          payload,
        })

        assert.equal(response.statusCode, 409)

        const data = response.json<z.infer<(typeof UserPostSchema.response)[409]>>()
        assert.partialDeepStrictEqual(data, {message: `Username already exists: '${username}'`})
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
  })

  describe('/api/users/:username', () => {
    describe('GET: /api/users/:username', () => {
      it('returns 200 with user when user exists', async () => {
        const user = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })

        const response = await app.inject({
          method: 'GET',
          url: `/api/users/${user.username}`,
        })

        assert.equal(response.statusCode, 200)

        const data = response.json<z.infer<(typeof UserGetOneSchema.response)[200]>>()
        assert.partialDeepStrictEqual(data, {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        })
      })

      it('returns 404 when user does not exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/users/nonexistent',
        })

        assert.equal(response.statusCode, 404)

        const data = response.json<z.infer<(typeof UserGetOneSchema.response)[404]>>()
        assert.deepEqual(data, {message: "User not found: 'nonexistent'"})
      })
    })

    describe('PATCH: /api/users/:username', () => {
      it('updates user details', async () => {
        const initial = await userRepository.create({
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
          },
        })

        assert.equal(response.statusCode, 200)

        const data = response.json<z.infer<(typeof UserGetOneSchema.response)[200]>>()
        assert.partialDeepStrictEqual(data, {
          firstName: 'Jane',
          lastName: 'Smith',
        })
      })

      it('persists the updated user in repository', async () => {
        const initial = await userRepository.create({
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

        const foundUser = await userRepository.getByUsername(initial.username)
        assert.ok(foundUser)
        assert.equal(foundUser.firstName, 'Jane')
      })

      it('returns 404 when user does not exist', async () => {
        const nonExistentUsername = chance.word()
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/users/${nonExistentUsername}`,
          payload: {
            firstName: 'Jane',
          },
        })

        assert.equal(response.statusCode, 404)

        const data = response.json<z.infer<(typeof UserGetOneSchema.response)[404]>>()
        assert.deepEqual(data, {message: `User not found: '${nonExistentUsername}'`})
      })

      it('returns 500 when user is inactive', async () => {
        const initial = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })
        await userRepository.update(initial.username, {status: 'inactive'})

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/users/${initial.username}`,
          payload: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        })

        assert.equal(response.statusCode, 500)

        const data = response.json<z.infer<(typeof UserPatchSchema.response)[500]>>()
        assert.partialDeepStrictEqual(data, {message: `User is inactive: '${initial.username}'`})
      })
    })

    describe('DELETE: /api/users/:username', () => {
      it('deletes user and returns 204', async () => {
        const user = await userRepository.create({
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
        const user = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })

        await app.inject({
          method: 'DELETE',
          url: `/api/users/${user.username}`,
        })

        const foundUser = await userRepository.getByUsername(user.username)
        assert.equal(foundUser, undefined)
      })

      it('returns 404 when user does not exist', async () => {
        const nonExistentUsername = chance.word()
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/users/${nonExistentUsername}`,
        })

        assert.equal(response.statusCode, 404)

        const data = response.json<z.infer<(typeof UserDeleteSchema.response)[404]>>()
        assert.deepEqual(data, {message: `User not found: '${nonExistentUsername}'`})
      })

      it('does not affect other users', async () => {
        const user1 = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })
        const user2 = await userRepository.create({
          username: chance.word(),
          firstName: chance.first(),
          lastName: chance.last(),
        })

        await app.inject({
          method: 'DELETE',
          url: `/api/users/${user1.username}`,
        })

        const user2Again = await userRepository.getByUsername(user2.username)
        assert.ok(user2Again)
        assert.deepEqual(user2Again, user2)
      })
    })
  })
})
