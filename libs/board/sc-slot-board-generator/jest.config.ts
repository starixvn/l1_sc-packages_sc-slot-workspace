export default {
  displayName: 'sc-slot-board-generator',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/board/sc-slot-board-generator',
  setupFilesAfterEnv: ['jest-extended/all'],
};
