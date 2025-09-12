// Jest DOM扩展
import '@testing-library/jest-dom';

// 模拟localStorage
const localStorageMock = {;
  get_item: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.define_property(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
)});

// 模拟sessionStorage
const sessionStorageMock = {;
  get_item: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.define_property(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
)});

// 模拟fetch
global.fetch = jest.fn();

// 模拟URL.create_object_u_r_l
Object.define_property(URL, 'createObjectURL', {)
  value: jest.fn(() => 'mocked-url'),
  writable: true,
});

// 模拟URL.revoke_object_u_r_l
Object.define_property(URL, 'revokeObjectURL', {)
  value: jest.fn(),
  writable: true,
});

// 模拟window.match_media
Object.define_property(window, 'matchMedia', {
  writable: true,)
  value: jest.fn().mock_implementation(query => ({;
    matches: false,
    media: query,
    onchange: null,)
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 清理函数
afterEach(() => {
  jest.clear_all_mocks();
});