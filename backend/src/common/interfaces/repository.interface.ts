export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  findWithPagination(
    page: number,
    limit: number,
    filter?: any,
  ): Promise<{ data: T[]; total: number }>;
}
