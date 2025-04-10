// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Optional setup file
  testEnvironment: 'jest-environment-jsdom',
  preset: 'ts-jest', // Use ts-jest preset
  moduleNameMapper: {
      // Handle module aliases (adjust based on your tsconfig.json)
      '^@/(.*)$': '<rootDir>/src/$1', // Corrected key
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)