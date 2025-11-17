import {type PaginateList} from '../../shared/pagination.ts'
import {PageCurrentError, PageSizeError, UsernameExistsError} from './user.error.ts'
import {type User} from './user.model.ts'

type CreatePayload = Pick<User, 'username' | 'firstName' | 'lastName'>
type UpdatePayload = Partial<Pick<User, 'firstName' | 'lastName' | 'status' | 'loginsCounter'>>

/**
 * In-memory data store for users
 * Access to store should be done with Promises to simulate async database operations.
 */
const store = new Map<string, User>()

/**
 * Returns a paginated list of users.
 * @throws PageCurrentError if pageCurrent is less than 1
 * @throws PageSizeError if pageSize is less than 1
 */
export async function getAll(pageCurrent: number, pageSize: number): Promise<PaginateList<User>> {
  if (pageCurrent < 1) throw new PageCurrentError(pageCurrent)
  if (pageSize < 1) throw new PageSizeError(pageSize)

  const users = await Promise.resolve(store.values())
  const usersAsArray = Array.from(users)

  const pageCount = Math.ceil(usersAsArray.length / pageSize)

  const offset = (pageCurrent - 1) * pageSize
  const limit = offset + pageSize
  const list = structuredClone(usersAsArray.slice(offset, limit))

  return {
    list,
    pageCurrent,
    pageSize,
    pageCount,
  }
}

/**
 * Returns an user by username.
 * Returns undefined, when not found.
 */
export async function getByUsername(username: string): Promise<User | undefined> {
  const user = await Promise.resolve(store.get(username))
  return structuredClone(user)
}

/**
 * Creates a new user in data store.
 * @throws Error when user with given username already exists.
 */
export async function create(data: CreatePayload): Promise<User> {
  const existingUser = await Promise.resolve(store.get(data.username))
  if (existingUser) throw new UsernameExistsError(data.username)

  const ts = new Date().toISOString()

  const user: User = {
    ...data,
    status: 'active',
    loginsCounter: 0,
    creationTime: ts,
    lastUpdateTime: ts,
  }
  await Promise.resolve(store.set(data.username, user))

  return Promise.resolve(structuredClone(user))
}

/**
 * Updates an user and returns it.
 * @throws Error when user with given username does not exist.
 */
export async function update(username: string, data: UpdatePayload): Promise<User | undefined> {
  const user = await Promise.resolve(store.get(username))
  if (!user) {
    return Promise.resolve(undefined)
  }

  if (data.firstName !== undefined) user.firstName = data.firstName
  if (data.lastName !== undefined) user.lastName = data.lastName
  if (data.status !== undefined) user.status = data.status
  if (data.loginsCounter !== undefined) user.loginsCounter = data.loginsCounter

  user.lastUpdateTime = new Date().toISOString()

  return Promise.resolve(structuredClone(user))
}

/** Removes a user by username. */
export async function remove(username: string): Promise<boolean> {
  const res = await Promise.resolve(store.delete(username))
  return Promise.resolve(res)
}

/** Removes all users. */
export async function clearAll(): Promise<void> {
  await Promise.resolve(store.clear())
}
