type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (!__DEV__) {
      return level === 'error';
    }
    return true;
  }

  debug(message: string, data?: unknown) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: unknown) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: unknown) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, error?: unknown) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error);

      if (!__DEV__) {
        // TODO: Integrate with Sentry or preferred logging backend
        // Sentry.captureException(error, { extra: { message } });
      }
    }
  }
}

export const logger = new Logger();


