const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

// Configure Nunjucks
nunjucks.configure(path.join(__dirname, '../src'), {
  autoescape: false,
  trimBlocks: false,
  lstripBlocks: false
});

// === HELPER: Convert kebab-case to camelCase ===
function toCamelCase(str) {
  return str
    .replace(/\.[^/.]+$/, '') // Remove file extension
    .replace(/_([a-z])/g, (match) => match[1].toUpperCase()); // day_banner → dayBanner
}

// === HELPER: Auto-discover and read all components ===
function discoverComponents() {
  const componentsDir = path.join(__dirname, '../components');
  const components = {};

  if (!fs.existsSync(componentsDir)) {
    console.error(`Components directory not found: ${componentsDir}`);
    return components;
  }

  const files = fs.readdirSync(componentsDir);

  files.forEach(file => {
    // Only include .html and .css files
    if (!file.endsWith('.html') && !file.endsWith('.css')) {
      return;
    }

    try {
      const filepath = path.join(componentsDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const variableName = toCamelCase(file);
      components[variableName] = content;
      console.log(`  ✓ Loaded: ${file} → {{ ${variableName} }}`);
    } catch (err) {
      console.error(`  ✗ Error reading ${file}:`, err.message);
    }
  });

  return components;
}

// === HELPER: Ensure output directory exists ===
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Build templates
function buildTemplates() {
  const srcDir = path.join(__dirname, '../src/templates');
  const outDir = path.join(__dirname, '../Test');

  // Ensure directories exist
  ensureDir(srcDir);
  ensureDir(outDir);

  // Check if templates exist
  if (!fs.existsSync(srcDir)) {
    console.error(`Source templates directory not found: ${srcDir}`);
    return;
  }

  // Auto-discover components
  console.log('🔍 Auto-discovering components...\n');
  const components = discoverComponents();
  console.log(`\n✨ Found ${Object.keys(components).length} component(s)\n`);

  // Read all .njk files
  const templates = fs.readdirSync(srcDir).filter(f => f.endsWith('.njk'));

  if (templates.length === 0) {
    console.warn(`No .njk templates found in ${srcDir}`);
    return;
  }

  console.log(`📋 Building ${templates.length} template(s)...\n`);

  templates.forEach(template => {
    console.log(`  ⚙️  ${template}`);
    
    try {
      // Render template with auto-discovered components
      const html = nunjucks.render(`templates/${template}`, components);

      // Write output
      const outputName = template.replace('.njk', '.html');
      const outputPath = path.join(outDir, outputName);
      fs.writeFileSync(outputPath, html, 'utf8');
      
      const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);
      console.log(`     ✅ ${outputName} (${sizeKB} KB)\n`);
    } catch (err) {
      console.error(`     ✗ Error:`, err.message, '\n');
    }
  });

  console.log('✨ Build complete!\n');
}

// Run build
buildTemplates();
