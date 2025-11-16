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

export const UserGetAllSchema = {
  response: {
    200: z.array(UserDto),
  },
} satisfies FastifySchema

export const UserGetOneSchema = {
  params: z.object({
    username: z.string(),
  }),
  response: {
    200: UserDto,
    404: GeneralMessageDto,
  },
} satisfies FastifySchema

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

export const UserPatchSchema = {
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  response: {
    200: UserDto,
    404: GeneralMessageDto,
  },
} satisfies FastifySchema

export const UserDeleteSchema = {
  params: z.object({
    username: z.string(),
  }),
  response: {
    204: z.undefined(),
    404: GeneralMessageDto,
  },
} satisfies FastifySchema
