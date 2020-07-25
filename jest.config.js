'use strict';

module.exports = {
  testEnvironment: 'node',
  testRunner: 'jest-circus/runner',
  clearMocks: true,
  transform: {},
  coverageReporters: ['text', 'html'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test/']
};
