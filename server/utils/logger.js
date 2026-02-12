import winston from 'winston';
import { mkdirSync } from 'fs';
import { existsSync } from 'fs';

// Create logs directory if it doesn't exist
if (!existsSync('logs')) {
  try {
    mkdirSync('logs', { recursive: true });
  } catch (err) {
    // Use console here since logger might not be ready yet
    console.error('Failed to create logs directory:', err);
  }
}

// Generate dated log filename (YYYY-MM-DD.log)
const getLogFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `logs/${year}-${month}-${day}.log`;
};

// Create a custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create logger instance with dated log file
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'precision-resume-backend' },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    // Single dated log file for all logs (errors, info, debug, etc.)
    // Filename format: logs/YYYY-MM-DD.log
    new winston.transports.File({
      filename: getLogFilename(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      handleExceptions: true,
      handleRejections: true,
    })
  ]
});

export default logger;
