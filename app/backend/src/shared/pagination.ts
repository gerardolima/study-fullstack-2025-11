export type PaginateList<T> = {
  list: T[]
  pageCurrent: number
  pageSize: number
  pageCount: number
}
