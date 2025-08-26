#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.log('Coverage summary file not found');
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const total = coverage.total;

  console.log('## 📊 Test Coverage Summary\n');
  console.log(`| Metric | Percentage | Covered/Total |`);
  console.log(`|--------|------------|---------------|`);
  console.log(`| Statements | ${total.statements.pct}% | ${total.statements.covered}/${total.statements.total} |`);
  console.log(`| Branches | ${total.branches.pct}% | ${total.branches.covered}/${total.branches.total} |`);
  console.log(`| Functions | ${total.functions.pct}% | ${total.functions.covered}/${total.functions.total} |`);
  console.log(`| Lines | ${total.lines.pct}% | ${total.lines.covered}/${total.lines.total} |`);

} catch (error) {
  console.error('Error reading coverage summary:', error.message);
  process.exit(1);
}