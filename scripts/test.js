const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../Test');
let passed = 0;
let failed = 0;
const issues = [];

function testFile(filename) {
  const filepath = path.join(testDir, filename);
  const html = fs.readFileSync(filepath, 'utf8');
  
  console.log(`\n📧 Testing: ${filename}\n`);
  
  // Test 1: DOCTYPE present
  if (!html.includes('<!DOCTYPE')) {
    issues.push(`${filename}: ❌ Missing DOCTYPE`);
    failed++;
  } else {
    console.log('  ✅ DOCTYPE present');
    passed++;
  }
  
  // Test 2: Meta charset
  if (!html.includes('charset=utf-8')) {
    issues.push(`${filename}: ❌ Missing charset meta tag`);
    failed++;
  } else {
    console.log('  ✅ Charset meta tag present');
    passed++;
  }
  
  // Test 3: Styles injected
  if (!html.includes('<style')) {
    issues.push(`${filename}: ❌ No styles found`);
    failed++;
  } else {
    console.log('  ✅ CSS styles present');
    passed++;
  }
  
  // Test 4: Check for broken variables
  if (html.includes('{{') && html.includes('}}')) {
    const matches = html.match(/\{\{[^}]+\}\}/g);
    issues.push(`${filename}: ❌ Unrendered variables found: ${matches.join(', ')}`);
    failed++;
  } else {
    console.log('  ✅ No unrendered variables');
    passed++;
  }
  
  // Test 5: Images have alt text
  const imgTags = html.match(/<img[^>]*>/g) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt=')).length;
  if (imgsWithoutAlt > 0) {
    issues.push(`${filename}: ⚠️  ${imgsWithoutAlt} image(s) missing alt text`);
    failed++;
  } else {
    console.log(`  ✅ All images have alt text (${imgTags.length} images)`);
    passed++;
  }
  
  // Test 6: Absolute URLs
  const relativeUrls = html.match(/(?:href|src)="(?!http|\/\/|mailto:|tel:)[^"]*"/g) || [];
  if (relativeUrls.length > 0) {
    issues.push(`${filename}: ⚠️  ${relativeUrls.length} relative URL(s) found (should be absolute)`);
    failed++;
  } else {
    console.log('  ✅ All URLs are absolute');
    passed++;
  }
  
  // Test 7: File size
  const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);
  if (sizeKB > 100) {
    issues.push(`${filename}: ⚠️  Large file: ${sizeKB}KB (consider optimizing)`);
  } else {
    console.log(`  ✅ File size: ${sizeKB}KB`);
    passed++;
  }
  
  // Test 8: Has content
  if (html.length < 500) {
    issues.push(`${filename}: ❌ Template too small (${html.length} bytes) - likely missing content`);
    failed++;
  } else {
    console.log(`  ✅ Content present (${html.length} bytes)`);
    passed++;
  }
}

// Run tests
console.log('\n🧪 Email Template Validation\n');
console.log('='.repeat(60));

// Check if Test directory exists
if (!fs.existsSync(testDir)) {
  console.log('\n❌ /Test/ folder not found.');
  console.log('ℹ️  Run: npm run build\n');
  process.exit(1);
}

let files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.html') && !f.startsWith('_'));

// Allow testing a specific file via command line: npm run test -- filename.html
const specificFile = process.argv[2];
if (specificFile) {
  if (!files.includes(specificFile)) {
    console.log(`\n❌ File not found: ${specificFile}`);
    console.log(`\nAvailable files:\n  ${files.join('\n  ')}\n`);
    process.exit(1);
  }
  files = [specificFile];
  console.log(`Testing specific file: ${specificFile}\n`);
}

if (files.length === 0) {
  console.log('\n❌ No HTML files in /Test/ folder.');
  console.log('ℹ️  Run: npm run build\n');
  process.exit(1);
}

console.log(`\nFound ${files.length} template(s) to validate\n`);

files.forEach(file => testFile(file));

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (issues.length > 0) {
  console.log('⚠️  Issues found:\n');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log();
}

if (failed === 0) {
  console.log('✨ All tests passed!\n');
}

process.exit(failed > 0 ? 1 : 0);
