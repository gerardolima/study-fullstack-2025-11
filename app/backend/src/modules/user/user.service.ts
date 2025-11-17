import {type PaginateList} from '../../shared/pagination.ts'
import {UserInactiveError} from './user.error.ts'
import {type User} from './user.model.ts'
import * as userRepository from './user.repository.ts'

type CreatePayload = Pick<User, 'username' | 'firstName' | 'lastName'>
type UpdateDetailsPayload = Partial<Pick<User, 'firstName' | 'lastName'>>
type UpdateStatusPayload = Pick<User, 'status'>

/** Returns all users. */
export const getAll = async (pageCurrent: number, pageSize: number): Promise<PaginateList<User>> => {
  return await userRepository.getAll(pageCurrent, pageSize)
}

/**
 * Returns an user by username.
 * Returns undefined, when not found.
 */
export const getByUsername = async (username: string): Promise<User | undefined> => {
  return await userRepository.getByUsername(username)
}

/**
 * Creates a new user in data store and returns the user.
 * @throws Error when user with given username already exists.
 */
export const create = async (data: CreatePayload): Promise<User> => {
  return await userRepository.create(data)
}

/**
 * Updates an user and returns the user.
 * Returns undefined, when not found.
 * @throws Error when user state is 'inactive'
 */
export const updateUserDetails = async (username: string, data: UpdateDetailsPayload): Promise<User | undefined> => {
  const targetUser = await userRepository.getByUsername(username)
  if (!targetUser) return undefined
  if (targetUser.status === 'inactive') throw new UserInactiveError(username)

  return await userRepository.update(username, data)
}

/**
 * Updates the status of a given user and returns the user.
 * Returns undefined, when not found.
 */
export const updateUserStatus = async (username: string, data: UpdateStatusPayload): Promise<User | undefined> => {
  return await userRepository.update(username, data)
}

/**
 * Increases the logins counter of a given user and returns the user.
 * Returns undefined, when not found.
 */
export const increaseLoginsCounter = async (username: string): Promise<User | undefined> => {
  const targetUser = await userRepository.getByUsername(username)
  if (!targetUser) return undefined
  if (targetUser.status === 'inactive') throw new UserInactiveError(username)

  targetUser.loginsCounter += 1
  return await userRepository.update(username, targetUser)
}

/**
 * Removes a user by username.
 * Returns whether the given user was found.
 */
export const remove = async (username: string): Promise<boolean> => {
  return await userRepository.remove(username)
}
