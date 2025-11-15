export class UsernameExistsError extends Error {
  constructor(username: string) {
    super(`User with username ${username} already exists`)
  }
}
