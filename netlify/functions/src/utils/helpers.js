/**
 * Format API response
 */
export function formatResponse(data, message = null) {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Format API error
 */
export function formatError(message, code = 'ERROR', details = null) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a random string
 */
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize string for DB
 */
export function sanitize(str) {
  if (!str) return '';
  return str.trim().slice(0, 1000);
}
