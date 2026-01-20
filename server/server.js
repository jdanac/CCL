const express = require('express');
const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');

const app = express();
const PORT = 3000;

// Configure Nunjucks
nunjucks.configure(path.join(__dirname, '../src'), {
  autoescape: false,
  trimBlocks: false,
  lstripBlocks: false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// === HELPER: Convert kebab-case to camelCase ===
function toCamelCase(str) {
  return str
    .replace(/\.[^/.]+$/, '') // Remove file extension
    .replace(/_([a-z])/g, (match) => match[1].toUpperCase());
}

// === API: Get all available components ===
app.get('/api/components', (req, res) => {
  const componentsDir = path.join(__dirname, '../components');
  
  if (!fs.existsSync(componentsDir)) {
    return res.status(404).json({ error: 'Components directory not found' });
  }

  const files = fs.readdirSync(componentsDir);
  const components = [];

  files.forEach(file => {
    if (file.endsWith('.html')) {
      const filepath = path.join(componentsDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const variableName = toCamelCase(file);
      
      components.push({
        id: variableName,
        name: file.replace('.html', '').replace(/_/g, ' '),
        fileName: file,
        content: content
      });
    }
  });

  res.json({ components });
});

// === API: Render template with selected components ===
app.post('/api/render', (req, res) => {
  try {
    const { selectedComponents } = req.body;
    const componentsDir = path.join(__dirname, '../components');
    
    // Load all component contents
    const componentData = {};
    const files = fs.readdirSync(componentsDir);
    
    files.forEach(file => {
      if (!file.endsWith('.html') && !file.endsWith('.css')) return;
      
      const filepath = path.join(componentsDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const variableName = toCamelCase(file);
      componentData[variableName] = content;
    });

    // Build component string from selected components in order
    let componentsHtml = '';
    if (selectedComponents && selectedComponents.length > 0) {
      selectedComponents.forEach(compId => {
        if (componentData[compId]) {
          componentsHtml += componentData[compId] + '\n\n';
        }
      });
    }

    // Render the template with all component data plus assembled components
    componentData['assembledComponents'] = componentsHtml;
    const html = nunjucks.render('templates/_gui_boilerplate.njk', componentData);
    
    res.json({ html });
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === API: Export final HTML ===
app.post('/api/export', (req, res) => {
  try {
    const { selectedComponents, filename } = req.body;
    const componentsDir = path.join(__dirname, '../components');
    
    // Load all component contents
    const componentData = {};
    const files = fs.readdirSync(componentsDir);
    
    files.forEach(file => {
      if (!file.endsWith('.html') && !file.endsWith('.css')) return;
      
      const filepath = path.join(componentsDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const variableName = toCamelCase(file);
      componentData[variableName] = content;
    });

    // Build component string from selected components in order
    let componentsHtml = '';
    if (selectedComponents && selectedComponents.length > 0) {
      selectedComponents.forEach(compId => {
        if (componentData[compId]) {
          componentsHtml += componentData[compId] + '\n\n';
        }
      });
    }

    componentData['assembledComponents'] = componentsHtml;
    const html = nunjucks.render('templates/_gui_boilerplate.njk', componentData);
    
    // Save to GUI_Output directory
    const outputDir = path.join(__dirname, '../GUI_Output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename || 'exported_template.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    
    res.json({ 
      success: true, 
      path: outputPath,
      filename: filename || 'exported_template.html',
      folder: 'GUI_Output'
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 CCL Template GUI running at http://localhost:${PORT}`);
  console.log(`📁 Serving components from: ${path.join(__dirname, '../components')}`);
  console.log(`\n✨ Open your browser to start building templates!\n`);
});
