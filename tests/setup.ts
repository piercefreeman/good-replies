// Add TextEncoder/TextDecoder for Node.js compatibility
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import { JSDOM } from 'jsdom';

// Set up JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://x.com',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set up global objects
global.document = dom.window.document;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

// Mock URL constructor
global.URL = dom.window.URL;

// Mock chrome extension APIs
const mockFn = () => {};
global.chrome = {
  runtime: {
    onMessage: {
      addListener: mockFn
    }
  },
  tabs: {
    query: mockFn,
    sendMessage: mockFn
  }
} as any;