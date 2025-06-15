import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Export mocks for use in tests
export { mockPush, mockReplace };
