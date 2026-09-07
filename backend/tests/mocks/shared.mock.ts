// Unit tests import services which use the bare `@echotrace/shared` specifier.
// Re-export the REAL shared sources (values + types) instead of stubbing — the
// shared package is pure logic, so tests exercise the actual implementations.
export * from '../../../shared/index.js';
