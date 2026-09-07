const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('artifacts/sample-garage-door-repair/src');

let counts = {};

const regex = /className="([^"]*)"/g;
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const cls = match[1];
    const classes = cls.split(/\s+/);
    classes.forEach(c => {
      if (/^(sm:|md:|lg:|xl:|2xl:)?(mb|mt|my|mx|pb|pt|py|px|gap|gap-x|gap-y|space-x|space-y|p|m)-[0-9]+$/.test(c)) {
        counts[c] = (counts[c] || 0) + 1;
      }
    });
  }
});

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log(sorted.slice(0, 30));
