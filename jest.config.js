/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: false,
            tsconfig: {
                module: 'commonjs',
                moduleResolution: 'node',
            },
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/scripts/**',
        '!src/**/__tests__/**',
        '!src/**/index.ts',
    ],
};
