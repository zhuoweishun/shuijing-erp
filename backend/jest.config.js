/** @type {import('jest').Config} */
export default {
  // 测试环境
  testEnvironment: 'node',
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'ts', 'json'],
  
  // 转换配置
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/*.(test|spec).ts',
    '<rootDir>/tests/**/*.ts'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/uploads/'
  ],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],
  
  // ESM 支持
  extensionsToTreatAsEsm: ['.ts'],
  
  // 全局变量
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // 模块名映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 设置和清理
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // 测试超时
  testTimeout: 10000,
  
  // 详细输出
  verbose: true
};