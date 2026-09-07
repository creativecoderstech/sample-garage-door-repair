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
  // smaller utility mappings
  'gap-2': 'gap-[var(--phi-space-1)]',
  'gap-3': 'gap-[var(--phi-space-2)]',
  'gap-4': 'gap-[var(--phi-space-3)]',
  'gap-5': 'gap-[var(--phi-space-3)]',
  'gap-6': 'gap-[var(--phi-space-4)]',
  'gap-8': 'gap-[var(--phi-space-4)]',
  'gap-10': 'gap-[var(--phi-space-5)]',
  'gap-12': 'gap-[var(--phi-space-5)]',
  
  'mb-2': 'mb-[var(--phi-space-1)]',
  'mb-3': 'mb-[var(--phi-space-2)]',
  'mb-4': 'mb-[var(--phi-space-3)]',
  'mb-6': 'mb-[var(--phi-space-4)]',
  'mb-8': 'mb-[var(--phi-space-4)]',
  'mb-10': 'mb-[var(--phi-space-5)]',
  'mb-12': 'mb-[var(--phi-space-5)]',
  'mb-16': 'mb-[var(--phi-space-6)]',
  'mb-20': 'mb-[var(--phi-space-6)]',
  'mb-24': 'mb-[var(--phi-space-7)]',

  'mt-2': 'mt-[var(--phi-space-1)]',
  'mt-3': 'mt-[var(--phi-space-2)]',
  'mt-4': 'mt-[var(--phi-space-3)]',
  'mt-6': 'mt-[var(--phi-space-4)]',
  'mt-8': 'mt-[var(--phi-space-4)]',
  'mt-10': 'mt-[var(--phi-space-5)]',
  'mt-12': 'mt-[var(--phi-space-5)]',
  'mt-16': 'mt-[var(--phi-space-6)]',

  'p-3': 'p-[var(--phi-space-2)]',
  'p-4': 'p-[var(--phi-space-3)]',
  'p-5': 'p-[var(--phi-space-3)]',
  'p-6': 'p-[var(--phi-space-4)]',
  'p-8': 'p-[var(--phi-space-4)]',
  'p-10': 'p-[var(--phi-space-5)]',
  'p-12': 'p-[var(--phi-space-5)]',

  'py-3': 'py-[var(--phi-space-2)]',
  'py-4': 'py-[var(--phi-space-3)]',
  'py-6': 'py-[var(--phi-space-4)]',
  'py-8': 'py-[var(--phi-space-4)]',
  'py-10': 'py-[var(--phi-space-5)]',
  'py-12': 'py-[var(--phi-space-5)]',
  'py-16': 'py-[var(--phi-space-6)]',
  'py-20': 'py-[var(--phi-space-6)]',
  
  'px-3': 'px-[var(--phi-space-2)]',
  'px-4': 'px-[var(--phi-space-3)]',
  'px-6': 'px-[var(--phi-space-4)]',
  'px-8': 'px-[var(--phi-space-4)]',

  'pb-4': 'pb-[var(--phi-space-3)]',
  'pb-6': 'pb-[var(--phi-space-4)]',
  'pb-8': 'pb-[var(--phi-space-4)]',
  'pb-12': 'pb-[var(--phi-space-5)]',
  
  'pt-4': 'pt-[var(--phi-space-3)]',
  'pt-6': 'pt-[var(--phi-space-4)]',
  'pt-8': 'pt-[var(--phi-space-4)]',
  'pt-12': 'pt-[var(--phi-space-5)]',
  'pt-16': 'pt-[var(--phi-space-6)]',
  'pt-20': 'pt-[var(--phi-space-6)]',
  'pt-24': 'pt-[var(--phi-space-6)]',
  
  'rounded-lg': 'rounded-[var(--phi-radius)]',
  'rounded-xl': 'rounded-[var(--phi-radius)]',
  'rounded-2xl': 'rounded-[var(--phi-radius)]',
};

const files = walk('artifacts/sample-garage-door-repair/src');

files.forEach(f => {
  // don't touch shadcn ui components inside src/components/ui
  if (f.includes('components/ui/')) return;
  
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  Object.keys(map).forEach(key => {
    // regex to match full word inside className string
    // e.g. className="something gap-2 something"
    // we use a regex with lookaround
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

  // Also replace 'gap-x-4' style if needed, but let's stick to the map for now.
  
  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Updated ${f}`);
  }
});
