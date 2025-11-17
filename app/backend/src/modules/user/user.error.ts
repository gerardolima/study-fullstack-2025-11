export class UsernameExistsError extends Error {
  constructor(username: string) {
    super(`Username already exists: '${username}'`)
  }
}

export class UserInactiveError extends Error {
  constructor(username: string) {
    super(`User is inactive: '${username}'`)
  }
}

export class PageCurrentError extends RangeError {
  constructor(pageCurrent: number) {
    super(`Page current must be non-negative: '${pageCurrent}'`)
  }
}

export class PageSizeError extends RangeError {
  constructor(pageSize: number) {
    super(`Page size must be non-negative: '${pageSize}'`)
  }
}
