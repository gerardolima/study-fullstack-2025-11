import {type FastifySchema} from 'fastify'
import {z} from 'zod'

const GeneralMessageDto = z.object({
  message: z.string(),
})

const UserDto = z.object({
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(['active', 'inactive']),
  loginsCounter: z.number(),
  creationTime: z.string(),
  lastUpdateTime: z.string(),
})

// /api/users
// ----------------------------------------------------------------------------

/** schema for: GET /api/users */
export const UserGetAllSchema = {
  querystring: z.object({
    pageCurrent: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().default(6),
  }),
  response: {
    200: z.object({
      list: z.array(UserDto),
      pageCurrent: z.number(),
      pageSize: z.number(),
      pageCount: z.number(),
    }),
  },
} satisfies FastifySchema

/** schema for: POST /api/users */
export const UserPostSchema = {
  body: z.object({
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  response: {
    201: UserDto,
    409: GeneralMessageDto,
  },
} satisfies FastifySchema

// //api/users/:username
// ----------------------------------------------------------------------------

/** schema for: GET /api/users/:username */
export const UserGetOneSchema = {
  params: z.object({
    username: z.string(),
  }),
  response: {
    200: UserDto,
    404: GeneralMessageDto,
  },
} satisfies FastifySchema

/** schema for: PATCH /api/users/:username */
export const UserPatchSchema = {
  params: z.object({
    username: z.string(),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
  response: {
    200: UserDto,
    404: GeneralMessageDto,
    409: GeneralMessageDto,
    500: GeneralMessageDto,
  },
} satisfies FastifySchema

/** schema for: DELETE /api/users/:id */
export const UserDeleteSchema = {
  params: z.object({
    username: z.string(),
  }),
  response: {
    204: z.undefined(),
    404: GeneralMessageDto,
  },
} satisfies FastifySchema

// /api/users/:username/status
// ----------------------------------------------------------------------------
/** schema for: PATCH /api/users/:username/status */
/*
export const UserStatusPatchSchema = {
  params: z.object({
    username: z.string(),
  }),
  body: z.object({
    status: z.enum(['active', 'inactive']),
  }),
  response: {
    200: UserDto,
    404: GeneralMessageDto,
  },
} satisfies FastifySchema
// */
