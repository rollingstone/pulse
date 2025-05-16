module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // jsdom environment for localStorage/sessionStorage and React hooks
  clearMocks: true,
};
