import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hashPassword } from '../lib/auth.js';

const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
process.stdout.write('New admin password (hidden): ');
const password = await prompt.question('');
prompt.close();
if (password.length < 12 || password.length > 256) throw new Error('Use a password between 12 and 256 characters.');
console.log(`\nSet this in .env:\nADMIN_PASSWORD_HASH=${hashPassword(password)}`);
