/**
 * @module utils/logger
 * @description Logger helper - console wrapper với prefix timestamp
 * @created 2026-02-11
 */

const timestamp = () => new Date().toISOString().slice(11, 19);

const info = (...args) => console.log(`[${timestamp()}] ℹ️ `, ...args);
const success = (...args) => console.log(`[${timestamp()}] ✅`, ...args);
const warn = (...args) => console.warn(`[${timestamp()}] ⚠️ `, ...args);
const error = (...args) => console.error(`[${timestamp()}] ❌`, ...args);
const debug = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${timestamp()}] 🐛`, ...args);
  }
};
const socket = (...args) => console.log(`[${timestamp()}] 🔌`, ...args);

module.exports = { info, success, warn, error, debug, socket };
