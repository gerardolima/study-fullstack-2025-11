/** In memory user repository for managing user data. */

import {UsernameExistsError} from './user.error.ts'
import {type User, type UserCreatePayload, type UserUpdatePayload} from './user.model.ts'

const store = new Map<string, User>()

/** Returns all users. */
export function getAll(): User[] {
  return structuredClone(Array.from(store.values()))
}

/**
 * Returns an user by username.
 * Returns undefined, when not found.
 */
export function getByUsername(username: string): User | undefined {
  return structuredClone(store.get(username))
}

/**
 * Creates a new user in data store.
 * @throws Error when user with given username already exists.
 */
export function create(data: UserCreatePayload): User {
  if (store.has(data.username)) {
    throw new UsernameExistsError(data.username)
  }

  const ts = new Date().toISOString()

  const user: User = {
    ...data,
    status: 'active',
    loginsCounter: 0,
    creationTime: ts,
    lastUpdateTime: ts,
  }
  store.set(data.username, user)

  return structuredClone(user)
}

/**
 * Updates an user and returns it.
 * @throws Error when user with given username does not exist.
 */
export function update(username: string, data: UserUpdatePayload): User | undefined {
  const user = store.get(username)
  if (!user) {
    return undefined
  }

  Object.assign(user, data, {lastUpdateTime: new Date().toISOString()})
  return structuredClone(user)
}

/** Removes a user by username. */
export function remove(username: string): boolean {
  return store.delete(username)
}
