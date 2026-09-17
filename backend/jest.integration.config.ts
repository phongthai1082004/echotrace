import type { Config } from 'jest';

// ponytail: integration chạy riêng khỏi unit — DB thật (echotrace_test, disposable),
// PayOS SDK mock ở biên mạng, còn lại (router/guard/DTO/Prisma) thật hết.
const config: Config = {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	rootDir: '.',
	roots: ['<rootDir>'],
	testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
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
		'^@echotrace/shared/(.*)$': '<rootDir>/../shared/$1',
		'^@echotrace/shared$': '<rootDir>/tests/mocks/shared.mock.ts',
		'^(\\.{1,2}/.+)\\.js$': '$1',
	},
	moduleDirectories: ['node_modules', '<rootDir>/src'],
	testTimeout: 30000,
	verbose: true,
	reporters: [
		'default',
		[
			'jest-html-reporters',
			{
				publicPath: './test-results',
				filename: 'test-report-integration.html',
				pageTitle: 'EchoTrace Integration Report',
				expand: false,
				openReport: false,
			},
		],
	],
	setupFiles: ['<rootDir>/tests/integration/env.ts'],
	globalSetup: '<rootDir>/tests/integration/global-setup.js',
};

export default config;
