# CRUD Implementation Blueprint

This blueprint follows the **Books** feature (`backend/src/features/books/`) as the reference implementation.

## Standard File Structure

```
features/<feature>/
  ├── index.ts                # Exports controller, service, routes
  ├── <feature>.controller.ts # Request handlers
  ├── <feature>.service.ts    # Business logic
  └── <feature>.routes.ts     # Route definitions
```

## Step-by-Step Implementation

### 1. Define DTOs (in `shared/dtos/<feature>/`)

```ts
// shared/dtos/book/book.dto.ts
export interface CreateBookDTO { title?: string; content: any; ... }
export interface UpdateBookDTO { content?: any; title?: string; ... }
export interface BookDTO { id: number; title: string; ... }
```

### 2. Create the Service

Extend `BaseService` or implement custom logic.

**Example (`books.service.ts`)**:

```ts
import { injectable } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import { BookDTO, CreateBookDTO, UpdatePagesDTO, BookMapper } from '@echotrace/shared';

export abstract class IBookService {
  abstract getById(bookId: number, userId: number): Promise<BookDTO>;
  abstract getMyBooks(userId: number): Promise<BookDTO[]>;
  abstract create(userId: number, data: CreateBookDTO): Promise<BookDTO>;
  abstract delete(bookId: number, userId: number): Promise<void>;
  abstract updatePages(bookId: number, userId: number, data: UpdatePagesDTO): Promise<void>;
}

@injectable()
export class BookService extends IBookService {
  async getById(bookId: number, userId: number) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError(ErrorCode.BOOK_NOT_FOUND, 404);
    if (book.userId !== userId) throw new AppError(ErrorCode.BOOK_FORBIDDEN, 403);
    return BookMapper.toDTO(book);
  }
  // ... other methods
}
```

### 3. Create the Controller

Handle request/response, call service, and return `ApiResponse`.

**Example (`books.controller.ts`)**:

```ts
import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { IBookService } from './books.service.js';
import { ApiResponse } from '../../middleware/api.response.js';
import { AppError } from '../../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';

@injectable()
export class BookController {
  constructor(@inject('IBookService') private readonly bookService: IBookService) {}

  getById = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.userId!);
    const book = await this.bookService.getById(id, userId);
    res.json(ApiResponse.success(book));
  };

  create = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    const { title, content, paperHeight, paperWidth } = req.body;
    // validate and parse input
    const book = await this.bookService.create(userId, { content, title, paperHeight, paperWidth });
    res.status(201).json(ApiResponse.success(book));
  };
  // ... other methods
}
```

### 4. Define Routes

Use `express.Router`, apply auth/validation middlewares, and wrap handlers with `asyncHandler`.

**Example (`books.routes.ts`)**:

```ts
import { container } from 'tsyringe';
import { Router } from 'express';
import { BookController } from './books.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
const bookCtrl = container.resolve(BookController);

const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(authMiddleware); // apply auth to all routes

router.get('/books/:id', asyncHandler((req, res) => bookCtrl.getById(req, res)));
router.post('/books', asyncHandler((req, res) => bookCtrl.create(req, res)));
// ... other routes

export default router;
```

### 5. Register Routes in `server.ts`

```ts
import booksRoutes from './features/books/books.routes.js';
apiRouter.use('/', booksRoutes);
```

## Summary

- **DTOs** define the shape of request/response data.
- **Service** contains business logic and data access (Prisma).
- **Controller** receives requests, calls service, and returns `ApiResponse`.
- **Routes** map endpoints to controller methods with middleware.
- **Error handling** uses `AppError` and the global error middleware.
- **Dependency injection** via tsyringe (register services in `di/container.ts`).