type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function currentLevel(): LogLevel {
  const envLevel =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined);
  if (envLevel && envLevel in LEVEL_ORDER) return envLevel;
  return process.env.NODE_ENV === "production" ? "error" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel()];
}

function fmt(level: LogLevel, args: unknown[]): unknown[] {
  const stamp = new Date().toISOString();
  return [`[${stamp}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  error(...args: unknown[]): void {
    if (shouldLog("error")) console.error(...fmt("error", args));
  },
  warn(...args: unknown[]): void {
    if (shouldLog("warn")) console.warn(...fmt("warn", args));
  },
  info(...args: unknown[]): void {
    if (shouldLog("info")) console.info(...fmt("info", args));
  },
  debug(...args: unknown[]): void {
    if (shouldLog("debug")) console.debug(...fmt("debug", args));
  },
};

export type Logger = typeof logger;
