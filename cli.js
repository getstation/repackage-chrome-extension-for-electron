#!/usr/bin/env node
const path = require('path');
const repackage = require('./index.js');

if(process.argv.length < 4) {
  console.log('Missing arguments');
  process.exit(1);
}

const srcDir = path.resolve(process.cwd(), process.argv[2]);
const targetDir = path.resolve(process.cwd(), process.argv[3]);

repackage(srcDir, targetDir);
