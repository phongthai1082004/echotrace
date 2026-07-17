export interface PaginationConfig {
    status?: string,          
    customerId?: number,         
    search?: string,       
    sort?: string,      
    order: string,           
    limit: number,                
    cursor: number     
}
export class QueryProcessor {
  constructor(private query: any) {}

  build() {
    const { search, sort, order, limit, cursor, ...filters } = this.query;

    const queryOptions: any = {
      where: { ...filters },
      orderBy: { [sort || 'id']: order === 'desc' ? 'desc' : 'asc' },
      take: Number(limit) || 10,
    };

    if (search) {
      queryOptions.where.name = { contains: search }; 
    }

    if (cursor) {
      queryOptions.cursor = { id: cursor }; 
      queryOptions.skip = 1; 
    }

    return queryOptions;
  }
}