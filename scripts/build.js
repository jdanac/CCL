const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

// Configure Nunjucks
nunjucks.configure(path.join(__dirname, '../src'), {
  autoescape: false,
  trimBlocks: false,
  lstripBlocks: false
});

// Read components
function readComponent(filename) {
  const filepath = path.join(__dirname, '../components', filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`Warning: Component ${filename} not found`);
    return '';
  }
  return fs.readFileSync(filepath, 'utf8');
}

// Ensure output directory exists
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

  // Read all .njk files
  const templates = fs.readdirSync(srcDir).filter(f => f.endsWith('.njk'));

  if (templates.length === 0) {
    console.warn(`No .njk templates found in ${srcDir}`);
    return;
  }

  console.log(`Found ${templates.length} template(s) to build...\n`);

  templates.forEach(template => {
    console.log(`Building ${template}...`);
    
    try {
      // Render template with component data
      const html = nunjucks.render(`templates/${template}`, {
        hero: readComponent('hero.html'),
        dayBanner: readComponent('day_banner.html'),
        tourBanner: readComponent('tour_banner.html'),
        threeColumns: readComponent('3_columns.html'),
        styles: readComponent('styles.css')
      });

      // Write output
      const outputName = template.replace('.njk', '.html');
      const outputPath = path.join(outDir, outputName);
      fs.writeFileSync(outputPath, html, 'utf8');
      
      console.log(`✓ ${outputName} created (${(html.length / 1024).toFixed(1)} KB)\n`);
    } catch (err) {
      console.error(`✗ Error building ${template}: ${err.message}\n`);
    }
  });

  console.log('Build complete! Output files in /Test directory.\n');
}

// Run build
buildTemplates();
