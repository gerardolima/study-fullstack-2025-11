import {type User, type UserCreatePayload, type UserUpdatePayload} from './user.model.ts'

import * as userRepository from './user.repository.ts'

/** Returns all users. */
export const getAll = (): User[] => {
  return userRepository.getAll()
}

/**
 * Returns an user by username.
 * Returns undefined, when not found.
 */
export const getByUsername = (username: string): User | undefined => {
  return userRepository.getByUsername(username)
}

/**
 * Creates a new user in data store.
 * @throws Error when user with given username already exists.
 */
export const create = (data: UserCreatePayload): User => {
  return userRepository.create(data)
}

/**
 * Updates an user and returns it.
 * @throws Error when user with given username does not exist.
 */
export const update = (username: string, data: UserUpdatePayload): User | undefined => {
  return userRepository.update(username, data)
}

/** Removes a user by username. */
export const remove = (username: string): boolean => {
  return userRepository.remove(username)
}
