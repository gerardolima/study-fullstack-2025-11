import * as assert from 'node:assert/strict'
import {beforeEach, describe, it} from 'node:test'
import Chance from 'chance'
import {UserInactiveError, UsernameExistsError} from './user.error.ts'
import {type User} from './user.model.ts'
import * as userRepository from './user.repository.ts'
import * as userService from './user.service.ts'

type UserCreatePayload = Pick<User, 'username' | 'firstName' | 'lastName'>

const chance = new Chance()

describe('user.service', () => {
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
      const users = await userService.getAll(1, 100)
      assert.partialDeepStrictEqual(users, {
        list: [],
        pageCurrent: 1,
        pageSize: 100,
        pageCount: 0,
      })
    })

    it('returns all users', async () => {
      const initials = await Promise.all([
        userService.create(makeUserCreatePayload()),
        userService.create(makeUserCreatePayload()),
        userService.create(makeUserCreatePayload()),
      ])

      const users = await userService.getAll(1, 10)

      assert.equal(users.list.length, 3)
      assert.ok(users.list.some((u) => u.username === initials[0].username))
      assert.ok(users.list.some((u) => u.username === initials[1].username))
      assert.ok(users.list.some((u) => u.username === initials[2].username))
    })

    it('returns a deep clone of users', async () => {
      // getAll users, mutate one user returned and repeat getAll the original
      // should not be affected by the mutation of the object returned by the
      // first call

      const user = await userService.create(makeUserCreatePayload())

      const fetch1 = await userService.getAll(1, 1)
      fetch1.list[0].firstName = 'Modified'

      const fetch2 = await userService.getAll(1, 1)
      assert.equal(fetch2.list[0].firstName, user.firstName)
    })
  })

  describe('getByUsername', () => {
    it('returns undefined when user does not exist', async () => {
      const user = await userService.getByUsername('nonexistent')
      assert.equal(user, undefined)
    })

    it('returns user when found by username', async () => {
      const createdUser = await userService.create(makeUserCreatePayload())

      const foundUser = await userService.getByUsername(createdUser.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
      assert.equal(foundUser.firstName, createdUser.firstName)
      assert.equal(foundUser.lastName, createdUser.lastName)
    })

    it('returns a deep clone of the user', async () => {
      const createdUser = await userService.create(makeUserCreatePayload())

      const foundUser = await userService.getByUsername(createdUser.username)
      assert.ok(foundUser)

      // mutate the returned user
      foundUser.firstName = 'Modified'

      // original should not be affected
      const freshUser = await userService.getByUsername(createdUser.username)
      assert.ok(freshUser)
      assert.equal(freshUser.firstName, createdUser.firstName)
    })
  })

  describe('create', () => {
    it('creates a new user with provided data', async () => {
      const payload = makeUserCreatePayload()

      const user = await userService.create(payload)

      assert.equal(user.username, payload.username)
      assert.equal(user.firstName, payload.firstName)
      assert.equal(user.lastName, payload.lastName)
    })

    it('sets default fields on new user', async () => {
      const payload = makeUserCreatePayload()

      const user = await userService.create(payload)

      assert.equal(user.status, 'active')
      assert.equal(user.loginsCounter, 0)
      assert.ok(user.creationTime)
      assert.ok(user.lastUpdateTime)
      assert.equal(user.creationTime, user.lastUpdateTime)
    })

    it('sets creation and update times as ISO 8601 strings', async () => {
      const payload = makeUserCreatePayload()

      const user = await userService.create(payload)

      // Check that timestamps are valid ISO 8601 strings
      assert.equal(user.creationTime, new Date(user.creationTime).toISOString())
      assert.equal(user.lastUpdateTime, new Date(user.lastUpdateTime).toISOString())
    })

    it('persists the user in store', async () => {
      const payload = makeUserCreatePayload()

      const createdUser = await userService.create(payload)
      const foundUser = await userService.getByUsername(payload.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
    })

    it('throws UsernameExistsError when username already exists', async () => {
      const payload = makeUserCreatePayload()
      await userService.create(payload)

      const prom = userService.create(payload)

      await assert.rejects(prom, UsernameExistsError)
    })

    it('returns a deep clone of created user', async () => {
      const payload = makeUserCreatePayload()

      const createdUser = await userService.create(payload)
      createdUser.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = await userService.getByUsername(payload.username)
      assert.ok(foundUser)
      assert.notEqual(foundUser.firstName, 'Modified')
    })
  })

  describe('updateUserDetails', () => {
    it('returns undefined when user does not exist', async () => {
      const payload = {firstName: 'Updated'}

      const result = await userService.updateUserDetails('nonexistent', payload)

      assert.equal(result, undefined)
    })

    it('updates fields with NON-undefined values', async () => {
      const user = await userService.create(makeUserCreatePayload())

      const updated = await userService.updateUserDetails(user.username, {
        firstName: 'NewFirst',
        lastName: 'NewLast',
      })

      assert.ok(updated)
      assert.equal(updated.firstName, 'NewFirst')
      assert.equal(updated.lastName, 'NewLast')
    })

    it('does NOT update fields with undefined values', async () => {
      const user = await userService.create(makeUserCreatePayload())

      const updated = await userService.updateUserDetails(user.username, {
        firstName: undefined,
        lastName: undefined,
      })

      assert.ok(updated)
      assert.equal(updated.firstName, user.firstName)
      assert.equal(updated.lastName, user.lastName)
      assert.equal(updated.status, user.status)
      assert.equal(updated.loginsCounter, user.loginsCounter)
    })

    it('updates lastUpdateTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalUpdateTime = user.lastUpdateTime

      const updated = await userService.updateUserDetails(user.username, {firstName: 'Updated'})

      assert.ok(updated)
      assert.ok(updated.lastUpdateTime)
      assert.ok(new Date(updated.lastUpdateTime).toISOString())
      assert.ok(new Date(updated.lastUpdateTime) >= new Date(originalUpdateTime))
    })

    it('does not change creationTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalCreationTime = user.creationTime

      const updated = await userService.updateUserDetails(user.username, {firstName: 'Updated'})

      assert.ok(updated)
      assert.equal(updated.creationTime, originalCreationTime)
    })

    it('throws UserInactiveError, when user is inactive', async () => {
      const user = await userService.create(makeUserCreatePayload())
      await userService.updateUserStatus(user.username, {status: 'inactive'})

      const prom = userService.updateUserDetails(user.username, {firstName: 'Updated'})

      await assert.rejects(prom, UserInactiveError)
    })

    it('persists changes in store', async () => {
      const user = await userService.create(makeUserCreatePayload())

      await userService.updateUserDetails(user.username, {firstName: 'Updated'})

      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })

    it('returns a deep clone of updated user', async () => {
      const user = await userService.create(makeUserCreatePayload())

      const updated = await userService.updateUserDetails(user.username, {firstName: 'Updated'})
      assert.ok(updated)

      updated.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })
  })

  describe('updateUserStatus', () => {
    it('returns undefined when user does not exist', async () => {
      const status = chance.pickone<User['status']>(['active', 'inactive'])

      const result = await userService.updateUserStatus('nonexistent', {status})

      assert.equal(result, undefined)
    })

    it('updates status', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const statuses = chance.shuffle<User['status']>(['active', 'inactive'])

      for (const status of statuses) {
        const updated = await userService.updateUserStatus(user.username, {status})

        assert.ok(updated)
        assert.equal(updated.status, status)
      }
    })

    it('updates lastUpdateTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalUpdateTime = user.lastUpdateTime
      const status = chance.pickone<User['status']>(['active', 'inactive'])

      const updated = await userService.updateUserStatus(user.username, {status})

      assert.ok(updated)
      assert.ok(updated.lastUpdateTime)
      assert.ok(new Date(updated.lastUpdateTime).toISOString())
      assert.ok(new Date(updated.lastUpdateTime) >= new Date(originalUpdateTime))
    })

    it('does not change creationTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalCreationTime = user.creationTime
      const status = chance.pickone<User['status']>(['active', 'inactive'])

      const updated = await userService.updateUserStatus(user.username, {status})

      assert.ok(updated)
      assert.equal(updated.creationTime, originalCreationTime)
    })

    it('persists changes in store', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const status = chance.pickone<User['status']>(['active', 'inactive'])

      await userService.updateUserStatus(user.username, {status})

      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.status, status)
    })

    it('returns a deep clone of updated user', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const statuses = chance.shuffle<User['status']>(['active', 'inactive'])

      const updated = await userService.updateUserStatus(user.username, {status: statuses[0]})

      assert.ok(updated)
      updated.status = statuses[1]

      // Original in store should not be affected
      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.status, statuses[0])
    })
  })

  describe('increaseLoginsCounter', () => {
    it('returns undefined when user does not exist', async () => {
      const result = await userService.increaseLoginsCounter('nonexistent')

      assert.equal(result, undefined)
    })

    it('increases loginsCounter by 1', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const initialCounter = user.loginsCounter

      const updated = await userService.increaseLoginsCounter(user.username)

      assert.ok(updated)
      assert.equal(updated.loginsCounter, initialCounter + 1)
    })

    it('increases loginsCounter multiple times', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const initialCounter = user.loginsCounter
      const increments = 5

      for (let i = 0; i < increments; i++) {
        const updated = await userService.increaseLoginsCounter(user.username)
        assert.ok(updated)
        assert.equal(updated.loginsCounter, initialCounter + i + 1)
      }
    })

    it('updates lastUpdateTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalUpdateTime = user.lastUpdateTime

      const updated = await userService.increaseLoginsCounter(user.username)

      assert.ok(updated)
      assert.ok(updated.lastUpdateTime)
      assert.ok(new Date(updated.lastUpdateTime).toISOString())
      assert.ok(new Date(updated.lastUpdateTime) >= new Date(originalUpdateTime))
    })

    it('does not change creationTime', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const originalCreationTime = user.creationTime

      const updated = await userService.increaseLoginsCounter(user.username)

      assert.ok(updated)
      assert.equal(updated.creationTime, originalCreationTime)
    })

    it('persists changes in store', async () => {
      const user = await userService.create(makeUserCreatePayload())
      const initialCounter = user.loginsCounter

      await userService.increaseLoginsCounter(user.username)

      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.loginsCounter, initialCounter + 1)
    })

    it('returns a deep clone of updated user', async () => {
      const user = await userService.create(makeUserCreatePayload())

      const updated = await userService.increaseLoginsCounter(user.username)
      assert.ok(updated)

      updated.loginsCounter = 999

      // Original in store should not be affected
      const foundUser = await userService.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.loginsCounter, 1)
    })

    it('allows incrementing counter for inactive users', async () => {
      const user = await userService.create(makeUserCreatePayload())
      await userService.updateUserStatus(user.username, {status: 'inactive'})

      const prom = userService.increaseLoginsCounter(user.username)

      await assert.rejects(prom, UserInactiveError)
    })
  })

  describe('remove', () => {
    it('returns false when user does not exist', async () => {
      const result = await userService.remove('nonexistent')

      assert.equal(result, false)
    })

    it('returns true when user is successfully removed', async () => {
      const user = await userService.create(makeUserCreatePayload())

      const result = await userService.remove(user.username)

      assert.equal(result, true)
    })

    it('removes user from store', async () => {
      const user = await userService.create(makeUserCreatePayload())

      await userService.remove(user.username)

      const foundUser = await userService.getByUsername(user.username)
      assert.equal(foundUser, undefined)
    })

    it('does not affect other users', async () => {
      const initial = await Promise.all([
        userService.create(makeUserCreatePayload()),
        userService.create(makeUserCreatePayload()),
        userService.create(makeUserCreatePayload()),
      ])

      await userService.remove(initial[1].username)

      const users = await userService.getAll(1, 10)
      assert.equal(users.list.length, 2)
      assert.ok(users.list.some((u) => u.username === initial[0].username))
      assert.ok(users.list.some((u) => u.username === initial[2].username))

      assert.ok(!users.list.some((u) => u.username === initial[1].username))
    })
  })
})
