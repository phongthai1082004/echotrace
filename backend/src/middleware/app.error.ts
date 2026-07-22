export class AppError extends Error {
  public errorCode: string;
  public statusCode: number;
  public details?: any;

  constructor(errorCode: string, statusCode: number = 400, details?: any) {
    super(errorCode);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
