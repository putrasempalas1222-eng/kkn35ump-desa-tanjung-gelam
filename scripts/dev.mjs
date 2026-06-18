import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const processes = [
  {
    name: 'backend',
    color: '\x1b[31m',
    args: ['run', 'dev', '--prefix', 'backend'],
  },
  {
    name: 'frontend',
    color: '\x1b[36m',
    args: ['run', 'dev', '--prefix', 'frontend'],
  },
];

const reset = '\x1b[0m';
const children = [];
let shuttingDown = false;

const prefixLine = (name, color, chunk) => {
  String(chunk)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => {
      process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
    });
};

const stopAll = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) child.kill('SIGTERM');
  });
  setTimeout(() => process.exit(code), 250);
};

processes.forEach(({ name, color, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: process.platform === 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.push(child);
  child.stdout.on('data', (chunk) => prefixLine(name, color, chunk));
  child.stderr.on('data', (chunk) => prefixLine(name, color, chunk));
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      prefixLine(name, color, `stopped with code ${code}`);
      stopAll(code || 1);
    }
  });
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
