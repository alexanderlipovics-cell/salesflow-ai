class Logger {
  debug(message, data) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, data ?? '');
  }

  info(message, data) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, data ?? '');
  }

  warn(message, data) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, data ?? '');
  }

  error(message, error) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error ?? '');
  }
}

const logger = new Logger();

module.exports = { logger };


