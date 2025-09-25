import Database from 'better-sqlite3';
import { config, type Config, type DatabaseConfig } from './config.js';
import { initializeDatabase } from '../db/schema.js';

/**
 * Dependency Injection Container
 * Manages service registration and resolution for better testability and maintainability
 */
export class Container {
  private services = new Map<string, any>();

  register<T>(name: string, factory: (container: Container) => T): void {
    this.services.set(name, factory);
  }

  get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) throw new Error(`Service ${name} not registered: ${name}`);
    return factory(this);
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}

/**
 * Logger Service - Standardized logging across the application
 */
export interface LogContext {
  userId?: number;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  operation?: string;
  [key: string]: any;
}

export class Logger {
  constructor(private fastify: any) {}

  info(message: string, context?: LogContext): void {
    this.fastify.log.info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.fastify.log.warn(context || {}, message);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logData = { ...(context || {}) };
    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    this.fastify.log.error(logData, message);
  }

  // Security events
  security(message: string, context: LogContext): void {
    this.fastify.log.warn({ ...context, level: 'security' }, message);
  }

  // Audit events
  audit(message: string, context: LogContext): void {
    this.fastify.log.info({ ...context, level: 'audit' }, message);
  }

  // Debug (only in development)
  debug(message: string, context?: LogContext): void {
    if (config === (global as any).environments?.development) {
      this.fastify.log.debug(context || {}, message);
    }
  }
}

/**
 * Service Interfaces
 */
export interface IDatabaseService {
  getConnection(): Database.Database;
  close(): void;
}

export interface ILoggerService {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  security(message: string, context: LogContext): void;
  audit(message: string, context: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

/**
 * Database Service Implementation
 */
export class DatabaseService implements IDatabaseService {
  private db: Database.Database;

  constructor(config: DatabaseConfig) {
    this.db = initializeDatabase(config.url);

    // Create default deleted user
    this.db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password)
      VALUES (0, '[deleted]', '')
    `).run();
  }

  getConnection(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Service Factory Functions
 */
export function createDatabaseService(container: Container): IDatabaseService {
  return new DatabaseService(config.database);
}

export function createLoggerService(container: Container): ILoggerService {
  // Logger needs fastify instance, will be set during app initialization
  return {} as ILoggerService; // Placeholder, will be replaced
}

/**
 * Initialize Container with all services
 */
export function initializeContainer(): Container {
  const container = new Container();

  // Register services
  container.register('database', createDatabaseService);
  container.register('config', () => config);

  return container;
}