import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@di/(.*)$': '<rootDir>/src/di/$1',
    // deep imports hit the real shared TS sources (ts-jest transforms them); the bare specifier maps to the mock
    '^@echotrace/shared/(.*)$': '<rootDir>/../shared/$1',
    // ESM-only / generated prisma modules — must precede the generic .js mapper
    '^(.*generated/prisma/client)(\\.js)?$': '<rootDir>/tests/mocks/prisma.generated.mock.ts',
    '^@prisma/adapter-pg$': '<rootDir>/tests/mocks/prisma-adapter.mock.ts',
    '^@echotrace/shared$': '<rootDir>/tests/mocks/shared.mock.ts',
    '^@prisma/client$': '<rootDir>/tests/mocks/prisma.mock.ts',
    // .js suffix → real module (TS sources); keeps the ./ / ../ prefix, bare deps untouched
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/server.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    'src/features/*/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/infrastructure/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'test-report.html',
        pageTitle: 'EchoTrace Test Report',
        expand: true,
        openReport: false,
        json: true,
      },
    ],
  ],
};

export default config;
