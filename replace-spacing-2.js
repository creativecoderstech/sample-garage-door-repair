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
  'space-y-2': 'space-y-[var(--phi-space-1)]',
  'space-y-3': 'space-y-[var(--phi-space-2)]',
  'space-y-4': 'space-y-[var(--phi-space-3)]',
  'space-y-5': 'space-y-[var(--phi-space-3)]',
  'space-y-6': 'space-y-[var(--phi-space-4)]',
  'space-y-8': 'space-y-[var(--phi-space-4)]',
  
  'space-x-2': 'space-x-[var(--phi-space-1)]',
  'space-x-3': 'space-x-[var(--phi-space-2)]',
  'space-x-4': 'space-x-[var(--phi-space-3)]',

  'mb-5': 'mb-[var(--phi-space-3)]',
  'mt-5': 'mt-[var(--phi-space-3)]',
  'px-5': 'px-[var(--phi-space-3)]',
  'py-5': 'py-[var(--phi-space-3)]',
  
  'lg:gap-16': 'lg:gap-[var(--phi-space-6)]',
  'md:gap-12': 'md:gap-[var(--phi-space-5)]',
  'sm:gap-8': 'sm:gap-[var(--phi-space-4)]',
  'md:gap-8': 'md:gap-[var(--phi-space-4)]',
  'lg:gap-8': 'lg:gap-[var(--phi-space-4)]',

  'lg:gap-20': 'lg:gap-[var(--phi-space-6)]',

  'mt-7': 'mt-[var(--phi-space-4)]',
  'mt-20': 'mt-[var(--phi-space-6)]',
  'mt-24': 'mt-[var(--phi-space-7)]',
  'mb-24': 'mb-[var(--phi-space-7)]',
  'py-24': 'py-[var(--phi-space-7)]',
  'pt-24': 'pt-[var(--phi-space-7)]',
  'pb-24': 'pb-[var(--phi-space-7)]',
  'pt-10': 'pt-[var(--phi-space-5)]',
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
    
    const regex2 = new RegExp(`(?<=className=\\{.*?)(?<![a-zA-Z0-9-])(${key})(?![a-zA-Z0-9-])`, 'g');
    if (regex2.test(content)) {
       content = content.replace(regex2, map[key]);
       changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Updated ${f}`);
  }
});
