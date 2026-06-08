// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AutoRefresh from "@/components/atoms/AutoRefresh";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("AutoRefresh", () => {
  it("llama a router.refresh() en cada intervalo", () => {
    render(<AutoRefresh intervalMs={60_000} />);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(120_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("no refresca cuando la pestaña está oculta", () => {
    const spy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");

    render(<AutoRefresh intervalMs={1_000} />);
    vi.advanceTimersByTime(5_000);
    expect(refresh).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("limpia el intervalo al desmontar", () => {
    const { unmount } = render(<AutoRefresh intervalMs={1_000} />);
    unmount();
    vi.advanceTimersByTime(10_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
