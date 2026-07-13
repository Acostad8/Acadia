import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
  const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const spyInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  const spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});

  beforeEach(() => {
    spyError.mockClear();
    spyWarn.mockClear();
    spyInfo.mockClear();
    spyDebug.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("expone métodos error/warn/info/debug", () => {
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("prefija con timestamp ISO y nivel", () => {
    logger.error("fallo");
    expect(spyError).toHaveBeenCalledOnce();
    const firstArg = spyError.mock.calls[0][0] as string;
    expect(firstArg).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*Z\] \[ERROR\]$/);
  });

  it("acepta múltiples argumentos", () => {
    logger.warn("contexto", { code: 42 });
    expect(spyWarn).toHaveBeenCalledWith(
      expect.stringContaining("[WARN]"),
      "contexto",
      { code: 42 }
    );
  });
});
