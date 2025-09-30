// // import Database from 'better-sqlite3';
// import { config, type Config } from './config';
// // import { initializeDatabase } from '../db/schema.js';

// /**
//  * Logger Service - Standardized logging across the application
//  */
// export interface LogContext {
//   userId?: number;
//   requestId?: string;
//   ip?: string;
//   userAgent?: string;
//   operation?: string;
//   [key: string]: any;
// }

// export class Logger {
//   constructor(private fastify: any) {}

//   info(message: string, context?: LogContext): void {
//     this.fastify.log.info(context || {}, message);
//   }

//   warn(message: string, context?: LogContext): void {
//     this.fastify.log.warn(context || {}, message);
//   }

//   error(message: string, error?: Error, context?: LogContext): void {
//     const logData = { ...(context || {}) };
//     if (error) {
//       logData.error = {
//         message: error.message,
//         stack: error.stack,
//         name: error.name
//       };
//     }
//     this.fastify.log.error(logData, message);
//   }

//   // Security events
//   security(message: string, context: LogContext): void {
//     this.fastify.log.warn({ ...context, level: 'security' }, message);
//   }

//   // Audit events
//   audit(message: string, context: LogContext): void {
//     this.fastify.log.info({ ...context, level: 'audit' }, message);
//   }

//   // Debug (only in development)
//   debug(message: string, context?: LogContext): void {
//     if (config === (global as any).environments?.development) {
//       this.fastify.log.debug(context || {}, message);
//     }
//   }
// }