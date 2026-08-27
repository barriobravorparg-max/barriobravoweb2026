import "@testing-library/jest-dom/vitest";

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// react-three-fiber's <Canvas> (used by the hero 3D token) measures its
// container via react-use-measure, which requires ResizeObserver. jsdom
// doesn't implement it, so stub it the same way IntersectionObserver is
// stubbed above — needed whenever a test renders a tree that mounts <Canvas>
// (e.g. app/page.test.tsx rendering the full composed page).
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
