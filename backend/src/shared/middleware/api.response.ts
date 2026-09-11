export class ApiResponse<T = any> {
	public success: boolean;
	public message: string;
	public data: T | null;
	public errors: any | null;
	public statusCode: number;
	public timestamp: string;

	private constructor(statusCode: number, success: boolean, message: string, data: T | null = null, errors: any = null) {
		this.statusCode = statusCode;
		this.success = success;
		this.message = message;
		this.data = data;
		this.errors = errors;
		this.timestamp = new Date().toISOString();
	}

	public static success<T>(data: T, message: string = 'Success', statusCode: number = 200): ApiResponse<T> {
		return new ApiResponse<T>(statusCode, true, message, data, null);
	}

	public static message(message: string, statusCode: number = 200): ApiResponse<null> {
		return new ApiResponse<null>(statusCode, true, message, null, null);
	}

	public static error(message: string, statusCode: number = 400, errors: any = null): ApiResponse<null> {
		return new ApiResponse<null>(statusCode, false, message, null, errors);
	}
}
