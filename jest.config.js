module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,js}'],
  coverageReporters: ['text', 'text-summary', 'cobertura'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
}
