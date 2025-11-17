import * as assert from 'node:assert/strict'
import {beforeEach, describe, it} from 'node:test'
import Chance from 'chance'
import {PageCurrentError, PageSizeError, UsernameExistsError} from './user.error.ts'
import {type User} from './user.model.ts'
import * as userRepository from './user.repository.ts'

type UserCreatePayload = Pick<User, 'username' | 'firstName' | 'lastName'>
type UserUpdatePayload = Partial<Pick<User, 'firstName' | 'lastName' | 'status' | 'loginsCounter'>>

const chance = new Chance()

describe('user.repository', () => {
  const makeUserCreatePayload = (overrides: Partial<UserCreatePayload> = {}): UserCreatePayload => ({
    username: chance.word({length: 10}),
    firstName: chance.first(),
    lastName: chance.last(),
    ...overrides,
  })

  beforeEach(async () => {
    await userRepository.clearAll()
  })

  describe('getAll', () => {
    it('returns empty array when no users exist', async () => {
      const result = await userRepository.getAll(1, 10)
      assert.deepEqual(result, {
        list: [],
        pageCurrent: 1,
        pageSize: 10,
        pageCount: 0,
      })
    })

    it('returns all users', async () => {
      const initials = await Promise.all([
        userRepository.create(makeUserCreatePayload()),
        userRepository.create(makeUserCreatePayload()),
        userRepository.create(makeUserCreatePayload()),
      ])

      const result = await userRepository.getAll(1, 10)

      assert.equal(result.list.length, 3)
      assert.ok(result.list.some((u) => u.username === initials[0].username))
      assert.ok(result.list.some((u) => u.username === initials[1].username))
      assert.ok(result.list.some((u) => u.username === initials[2].username))
      assert.equal(result.pageCount, 1)
    })

    it('returns a deep clone of users', async () => {
      const user = await userRepository.create(makeUserCreatePayload())
      const result = await userRepository.getAll(1, 10)

      // mutate the returned user
      result.list[0].firstName = 'Modified'

      // original should not be affected
      const freshResult = await userRepository.getAll(1, 10)
      assert.equal(freshResult.list[0].firstName, user.firstName)
    })

    it('throws PageCurrentError when pageCurrent is less than 1', async () => {
      const invalidPageCurrent = chance.integer({max: 0})
      const prom = userRepository.getAll(invalidPageCurrent, 10)

      await assert.rejects(prom, PageCurrentError)
    })

    it('throws PageSizeError when pageSize is less than 1', async () => {
      const invalidPageSize = chance.integer({max: 0})
      const prom = userRepository.getAll(1, invalidPageSize)

      await assert.rejects(prom, PageSizeError)
    })

    it('handles pagination correctly with multiple pages', async () => {
      const pageSize = 3
      await Promise.all([
        // page 1
        userRepository.create(makeUserCreatePayload({firstName: 'A', lastName: '1'})),
        userRepository.create(makeUserCreatePayload({firstName: 'B', lastName: '1'})),
        userRepository.create(makeUserCreatePayload({firstName: 'C', lastName: '1'})),
        // page 2
        userRepository.create(makeUserCreatePayload({firstName: 'D', lastName: '2'})),
        userRepository.create(makeUserCreatePayload({firstName: 'E', lastName: '2'})),
      ])

      const page1 = await userRepository.getAll(1, pageSize)
      assert.equal(page1.list.length, pageSize)
      assert.partialDeepStrictEqual(page1, {
        pageCurrent: 1,
        pageSize,
        pageCount: 2,
      })

      const page2 = await userRepository.getAll(2, pageSize)
      assert.equal(page2.list.length, 2)
      assert.partialDeepStrictEqual(page2, {
        pageCurrent: 2,
        pageSize,
        pageCount: 2,
      })
    })

    it('returns empty data for page beyond available data', async () => {
      await userRepository.create(makeUserCreatePayload())

      const result = await userRepository.getAll(5, 10)
      assert.equal(result.list.length, 0)
      assert.equal(result.pageCount, 1)
    })
  })

  describe('getByUsername', () => {
    it('returns undefined when user does not exist', async () => {
      const user = await userRepository.getByUsername('nonexistent')
      assert.equal(user, undefined)
    })

    it('returns user when found by username', async () => {
      const createdUser = await userRepository.create(makeUserCreatePayload())

      const foundUser = await userRepository.getByUsername(createdUser.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
      assert.equal(foundUser.firstName, createdUser.firstName)
      assert.equal(foundUser.lastName, createdUser.lastName)
    })

    it('returns a deep clone of the user', async () => {
      const createdUser = await userRepository.create(makeUserCreatePayload())

      const foundUser = await userRepository.getByUsername(createdUser.username)
      assert.ok(foundUser)

      // mutate the returned user
      foundUser.firstName = 'Modified'

      // original should not be affected
      const freshUser = await userRepository.getByUsername(createdUser.username)
      assert.ok(freshUser)
      assert.equal(freshUser.firstName, createdUser.firstName)
    })
  })

  describe('create', () => {
    it('creates a new user with provided data', async () => {
      const payload = makeUserCreatePayload()

      const user = await userRepository.create(payload)

      assert.equal(user.username, payload.username)
      assert.equal(user.firstName, payload.firstName)
      assert.equal(user.lastName, payload.lastName)
    })

    it('sets default fields on new user', async () => {
      const payload = makeUserCreatePayload()

      const user = await userRepository.create(payload)

      assert.equal(user.status, 'active')
      assert.equal(user.loginsCounter, 0)
      assert.ok(user.creationTime)
      assert.ok(user.lastUpdateTime)
      assert.equal(user.creationTime, user.lastUpdateTime)
    })

    it('sets creation and update times as ISO 8601 strings', async () => {
      const payload = makeUserCreatePayload()

      const user = await userRepository.create(payload)

      // Check that timestamps are valid ISO 8601 strings
      assert.equal(user.creationTime, new Date(user.creationTime).toISOString())
      assert.equal(user.lastUpdateTime, new Date(user.lastUpdateTime).toISOString())
    })

    it('persists the user in store', async () => {
      const payload = makeUserCreatePayload()

      const createdUser = await userRepository.create(payload)
      const foundUser = await userRepository.getByUsername(payload.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
    })

    it('throws UsernameExistsError when username already exists', async () => {
      const payload = makeUserCreatePayload()
      await userRepository.create(payload)

      const prom = userRepository.create(payload)

      await assert.rejects(prom, UsernameExistsError)
    })

    it('returns a deep clone of created user', async () => {
      const payload = makeUserCreatePayload()

      const createdUser = await userRepository.create(payload)
      createdUser.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = await userRepository.getByUsername(payload.username)
      assert.ok(foundUser)
      assert.notEqual(foundUser.firstName, 'Modified')
    })
  })

  describe('update', () => {
    it('returns undefined when user does not exist', async () => {
      const payload: UserUpdatePayload = {firstName: 'Updated'}

      const result = await userRepository.update('nonexistent', payload)

      assert.equal(result, undefined)
    })

    it('updates user firstName', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.firstName, 'Updated')
      assert.equal(updatedUser.lastName, user.lastName)
    })

    it('updates user lastName', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {lastName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.lastName, 'Updated')
      assert.equal(updatedUser.firstName, user.firstName)
    })

    it('updates user status', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {status: 'inactive'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.status, 'inactive')
    })

    it('updates user loginsCounter', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {loginsCounter: 5})

      assert.ok(updatedUser)
      assert.equal(updatedUser.loginsCounter, 5)
    })

    it('updates multiple fields at once', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {
        firstName: 'NewFirst',
        lastName: 'NewLast',
        status: 'inactive',
        loginsCounter: 10,
      })

      assert.ok(updatedUser)
      assert.equal(updatedUser.firstName, 'NewFirst')
      assert.equal(updatedUser.lastName, 'NewLast')
      assert.equal(updatedUser.status, 'inactive')
      assert.equal(updatedUser.loginsCounter, 10)
    })

    it('updates lastUpdateTime', async () => {
      const user = await userRepository.create(makeUserCreatePayload())
      const originalUpdateTime = user.lastUpdateTime

      const updatedUser = await userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.ok(updatedUser.lastUpdateTime)
      // lastUpdateTime should be a valid ISO timestamp
      assert.ok(new Date(updatedUser.lastUpdateTime).toISOString())
      // lastUpdateTime should be greater than or equal to original
      assert.ok(new Date(updatedUser.lastUpdateTime) >= new Date(originalUpdateTime))
    })

    it('does not change creationTime', async () => {
      const user = await userRepository.create(makeUserCreatePayload())
      const originalCreationTime = user.creationTime

      const updatedUser = await userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.creationTime, originalCreationTime)
    })

    it('persists changes in store', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      await userRepository.update(user.username, {firstName: 'Updated'})

      const foundUser = await userRepository.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })

    it('returns a deep clone of updated user', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const updatedUser = await userRepository.update(user.username, {firstName: 'Updated'})
      assert.ok(updatedUser)

      updatedUser.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = await userRepository.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })
  })

  describe('remove', () => {
    it('returns false when user does not exist', async () => {
      const result = await userRepository.remove('nonexistent')

      assert.equal(result, false)
    })

    it('returns true when user is successfully removed', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      const result = await userRepository.remove(user.username)

      assert.equal(result, true)
    })

    it('removes user from store', async () => {
      const user = await userRepository.create(makeUserCreatePayload())

      await userRepository.remove(user.username)

      const foundUser = await userRepository.getByUsername(user.username)
      assert.equal(foundUser, undefined)
    })

    it('does not affect other users', async () => {
      const initial = await Promise.all([
        userRepository.create(makeUserCreatePayload()),
        userRepository.create(makeUserCreatePayload()),
        userRepository.create(makeUserCreatePayload()),
      ])

      await userRepository.remove(initial[1].username)

      const result = await userRepository.getAll(1, 10)
      assert.equal(result.list.length, 2)
      assert.ok(result.list.some((u) => u.username === initial[0].username))
      assert.ok(result.list.some((u) => u.username === initial[2].username))

      assert.ok(!result.list.some((u) => u.username === initial[1].username))
    })
  })
})
