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

const map = {
  'gap-x-4': 'gap-x-[var(--phi-space-3)]',
  'gap-y-3': 'gap-y-[var(--phi-space-2)]',
  'px-12': 'px-[var(--phi-space-5)]',
  'md:p-16': 'md:p-[var(--phi-space-6)]',
  'mx-6': 'mx-[var(--phi-space-4)]'
};

const files = walk('artifacts/sample-garage-door-repair/src');

files.forEach(f => {
  if (f.includes('components/ui/')) return;
  
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  Object.keys(map).forEach(key => {
    const regex = new RegExp(`(?<=className="[^"]*)(?<![a-zA-Z0-9-])(${key})(?![a-zA-Z0-9-])`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, map[key]);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Updated ${f}`);
  }
});
