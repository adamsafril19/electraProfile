// errorHandler membaca err.statusCode untuk menentukan status HTTP
export class AppError extends Error {
  constructor(message: string, public statusCode: number = 400, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'AppError';
  }
}
