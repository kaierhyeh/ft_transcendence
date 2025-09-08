// for functions for handling errors and aroud errors

import	{
		AppError
		} from "./errors";

// e - for error, s - for function name or custom message
export function logError(e:unknown, s:string): void {
	if (e instanceof AppError) {
		console.error(`${e.type} [${s}]: ${e.message}`, e.extra ? { details: e.extra } : '');
	} else if (e instanceof Error) {
		console.error(`${e.name} [${s}]: ${e.message}`, e.stack);
	} else {
		console.error(`Unknown error [${s}]:`, e)
	}
}

export function getErrorCode(e:unknown): string {
	if (e instanceof AppError || e instanceof Error)
		return (e.message);
	if (typeof e === 'string')
		return (e);
	return ('Unknown error');
}

export function getErrorMessage(e:unknown): number {
	if (e instanceof AppError)
		return (e.errorCode);
	return (500);
}
