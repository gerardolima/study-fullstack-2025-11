import * as assert from 'node:assert/strict'
import {beforeEach, describe, it} from 'node:test'
import Chance from 'chance'
import {UsernameExistsError} from './user.error.ts'
import * as userRepository from './user.repository.ts'
import {type UserCreatePayload, type UserUpdatePayload} from './user.model.ts'

const chance = new Chance()

describe('user.repository', () => {
  const makeUserCreatePayload = (overrides: Partial<UserCreatePayload> = {}): UserCreatePayload => ({
    username: chance.word({length: 10}),
    firstName: chance.first(),
    lastName: chance.last(),
    ...overrides,
  })

  beforeEach(() => {
    userRepository.clearAll()
  })

  describe('getAll', () => {
    it('returns empty array when no users exist', () => {
      const users = userRepository.getAll()
      assert.deepEqual(users, [])
    })

    it('returns all users', () => {
      const user1 = userRepository.create(makeUserCreatePayload())
      const user2 = userRepository.create(makeUserCreatePayload())
      const user3 = userRepository.create(makeUserCreatePayload())

      const users = userRepository.getAll()

      assert.equal(users.length, 3)
      assert.ok(users.some((u) => u.username === user1.username))
      assert.ok(users.some((u) => u.username === user2.username))
      assert.ok(users.some((u) => u.username === user3.username))
    })

    it('returns a deep clone of users', () => {
      const user = userRepository.create(makeUserCreatePayload())
      const users = userRepository.getAll()

      // mutate the returned user
      users[0].firstName = 'Modified'

      // original should not be affected
      const freshUsers = userRepository.getAll()
      assert.equal(freshUsers[0].firstName, user.firstName)
    })
  })

  describe('getByUsername', () => {
    it('returns undefined when user does not exist', () => {
      const user = userRepository.getByUsername('nonexistent')
      assert.equal(user, undefined)
    })

    it('returns user when found by username', () => {
      const createdUser = userRepository.create(makeUserCreatePayload())

      const foundUser = userRepository.getByUsername(createdUser.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
      assert.equal(foundUser.firstName, createdUser.firstName)
      assert.equal(foundUser.lastName, createdUser.lastName)
    })

    it('returns a deep clone of the user', () => {
      const createdUser = userRepository.create(makeUserCreatePayload())

      const foundUser = userRepository.getByUsername(createdUser.username)
      assert.ok(foundUser)

      // mutate the returned user
      foundUser.firstName = 'Modified'

      // original should not be affected
      const freshUser = userRepository.getByUsername(createdUser.username)
      assert.ok(freshUser)
      assert.equal(freshUser.firstName, createdUser.firstName)
    })
  })

  describe('create', () => {
    it('creates a new user with provided data', () => {
      const payload = makeUserCreatePayload()

      const user = userRepository.create(payload)

      assert.equal(user.username, payload.username)
      assert.equal(user.firstName, payload.firstName)
      assert.equal(user.lastName, payload.lastName)
    })

    it('sets default fields on new user', () => {
      const payload = makeUserCreatePayload()

      const user = userRepository.create(payload)

      assert.equal(user.status, 'active')
      assert.equal(user.loginsCounter, 0)
      assert.ok(user.creationTime)
      assert.ok(user.lastUpdateTime)
      assert.equal(user.creationTime, user.lastUpdateTime)
    })

    it('sets creation and update times as ISO 8601 strings', () => {
      const payload = makeUserCreatePayload()

      const user = userRepository.create(payload)

      // Check that timestamps are valid ISO 8601 strings
      assert.equal(user.creationTime, new Date(user.creationTime).toISOString())
      assert.equal(user.lastUpdateTime, new Date(user.lastUpdateTime).toISOString())
    })

    it('persists the user in store', () => {
      const payload = makeUserCreatePayload()

      const createdUser = userRepository.create(payload)
      const foundUser = userRepository.getByUsername(payload.username)

      assert.ok(foundUser)
      assert.equal(foundUser.username, createdUser.username)
    })

    it('throws UsernameExistsError when username already exists', () => {
      const payload = makeUserCreatePayload()

      userRepository.create(payload)

      assert.throws(() => userRepository.create(payload), UsernameExistsError)
    })

    it('returns a deep clone of created user', () => {
      const payload = makeUserCreatePayload()

      const createdUser = userRepository.create(payload)
      createdUser.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = userRepository.getByUsername(payload.username)
      assert.ok(foundUser)
      assert.notEqual(foundUser.firstName, 'Modified')
    })
  })

  describe('update', () => {
    it('returns undefined when user does not exist', () => {
      const payload: UserUpdatePayload = {firstName: 'Updated'}

      const result = userRepository.update('nonexistent', payload)

      assert.equal(result, undefined)
    })

    it('updates user firstName', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.firstName, 'Updated')
      assert.equal(updatedUser.lastName, user.lastName)
    })

    it('updates user lastName', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {lastName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.lastName, 'Updated')
      assert.equal(updatedUser.firstName, user.firstName)
    })

    it('updates user status', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {status: 'inactive'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.status, 'inactive')
    })

    it('updates user loginsCounter', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {loginsCounter: 5})

      assert.ok(updatedUser)
      assert.equal(updatedUser.loginsCounter, 5)
    })

    it('updates multiple fields at once', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {
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

    it('updates lastUpdateTime', () => {
      const user = userRepository.create(makeUserCreatePayload())
      const originalUpdateTime = user.lastUpdateTime

      const updatedUser = userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.ok(updatedUser.lastUpdateTime)
      // lastUpdateTime should be a valid ISO timestamp
      assert.ok(new Date(updatedUser.lastUpdateTime).toISOString())
      // lastUpdateTime should be greater than or equal to original
      assert.ok(new Date(updatedUser.lastUpdateTime) >= new Date(originalUpdateTime))
    })

    it('nots change creationTime', () => {
      const user = userRepository.create(makeUserCreatePayload())
      const originalCreationTime = user.creationTime

      const updatedUser = userRepository.update(user.username, {firstName: 'Updated'})

      assert.ok(updatedUser)
      assert.equal(updatedUser.creationTime, originalCreationTime)
    })

    it('persists changes in store', () => {
      const user = userRepository.create(makeUserCreatePayload())

      userRepository.update(user.username, {firstName: 'Updated'})

      const foundUser = userRepository.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })

    it('returns a deep clone of updated user', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const updatedUser = userRepository.update(user.username, {firstName: 'Updated'})
      assert.ok(updatedUser)

      updatedUser.firstName = 'Modified'

      // Original in store should not be affected
      const foundUser = userRepository.getByUsername(user.username)
      assert.ok(foundUser)
      assert.equal(foundUser.firstName, 'Updated')
    })
  })

  describe('remove', () => {
    it('returns false when user does not exist', () => {
      const result = userRepository.remove('nonexistent')

      assert.equal(result, false)
    })

    it('returns true when user is successfully removed', () => {
      const user = userRepository.create(makeUserCreatePayload())

      const result = userRepository.remove(user.username)

      assert.equal(result, true)
    })

    it('removes user from store', () => {
      const user = userRepository.create(makeUserCreatePayload())

      userRepository.remove(user.username)

      const foundUser = userRepository.getByUsername(user.username)
      assert.equal(foundUser, undefined)
    })

    it('does not affect other users', () => {
      const user1 = userRepository.create(makeUserCreatePayload())
      const user2 = userRepository.create(makeUserCreatePayload())
      const user3 = userRepository.create(makeUserCreatePayload())

      userRepository.remove(user2.username)

      const users = userRepository.getAll()
      assert.equal(users.length, 2)
      assert.ok(users.some((u) => u.username === user1.username))
      assert.ok(users.some((u) => u.username === user3.username))

      assert.ok(!users.some((u) => u.username === user2.username))
    })
  })
})
