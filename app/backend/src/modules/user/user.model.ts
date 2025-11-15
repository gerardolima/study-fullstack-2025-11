export type User = {
  username: string // "PRIMARY KEY"
  firstName: string
  lastName: string
  status: 'active' | 'inactive'
  loginsCounter: number
  creationTime: string // serialized as ISO 8601 string
  lastUpdateTime: string // serialized as ISO 8601 string
}

export type UserCreatePayload = Pick<User, 'username' | 'firstName' | 'lastName'>

export type UserUpdatePayload = Partial<Pick<User, 'firstName' | 'lastName' | 'status' | 'loginsCounter'>>
