/**
 * Script to prepare Netlify Functions by copying backend source files
 */
import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const srcDir = join(rootDir, 'backend', 'src');
const destDir = join(rootDir, 'netlify', 'functions', 'src');

console.log('Preparing Netlify Functions...');

// Remove old copy if exists
if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true });
  console.log('Removed old src directory');
}

// Copy backend/src to netlify/functions/src
mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true });
console.log('Copied backend/src to netlify/functions/src');

console.log('Done!');
