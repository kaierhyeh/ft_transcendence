// // for custom errors classes

// // chat errors types
// export enum AppErrorType {
// 	VALIDATION_ERROR = 'VALIDATION_ERROR',
// 	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
// 	NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
// 	DATABASE_ERROR = 'DATABASE_ERROR'
// }

// // errors factory
// export class AppError extends Error {
// 	type: AppErrorType;
// 	errorCode: number;
// 	extra?: any;

// 	constructor(m:string, type:AppErrorType, errorCode:number, extra?:any) {
// 		super(m);
// 		this.name = 'AppError';
// 		this.type = type;
// 		this.errorCode = errorCode;"INVALID DATA"
// 		this.extra = extra;
// 	}
// }

// // errors, ASC order by number
// export async function chatValidationError(m:string, extra?: any) {
// 	return new AppError(m, AppErrorType.VALIDATION_ERROR, 400, extra);	
// }

// export async function chatAuthenticationError(m:string, extra?: any) {
// 	return new AppError(m, AppErrorType.AUTHENTICATION_ERROR, 401, extra);	
// }

// export async function chatNotFoundError(m:string, extra?: any) {
// 	return new AppError(m, AppErrorType.NOT_FOUND_ERROR, 404, extra);	
// }

// export async function chatDatabaseError(m:string, extra?: any) {
// 	return new AppError(m, AppErrorType.DATABASE_ERROR, 500, extra);	
// }
