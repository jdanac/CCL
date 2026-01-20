// State
let availableComponents = [];
let selectedComponents = [];
let currentViewport = 'mobile'; // Default viewport

// DOM Elements
const componentsList = document.getElementById('componentsList');
const canvas = document.getElementById('canvas');
const previewFrame = document.getElementById('previewFrame');
const clearBtn = document.getElementById('clearBtn');
const previewBtn = document.getElementById('previewBtn');
const exportBtn = document.getElementById('exportBtn');
const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');
const exportModal = document.getElementById('exportModal');
const exportFilename = document.getElementById('exportFilename');
const cancelExportBtn = document.getElementById('cancelExportBtn');
const confirmExportBtn = document.getElementById('confirmExportBtn');

// Viewport buttons
const mobileBtn = document.querySelector('.mobile-btn');
const desktopBtn = document.querySelector('.desktop-btn');

// Initialize
async function init() {
  await loadComponents();
  setupEventListeners();
  setupSortable();
  setViewport('mobile'); // Set default viewport
}

// Load available components from server
async function loadComponents() {
  try {
    const response = await fetch('/api/components');
    const data = await response.json();
    availableComponents = data.components;
    renderComponentLibrary();
  } catch (error) {
    console.error('Error loading components:', error);
    componentsList.innerHTML = '<div class="loading">Error loading components</div>';
  }
}

// Render component library
function renderComponentLibrary() {
  componentsList.innerHTML = '';
  
  availableComponents.forEach(component => {
    const item = document.createElement('div');
    item.className = 'component-item';
    item.dataset.componentId = component.id;
    item.innerHTML = `
      <span class="component-icon">📦</span>
      <div class="component-name">${component.name}</div>
    `;
    componentsList.appendChild(item);
  });
}

// Setup Sortable.js for drag and drop
function setupSortable() {
  // Make component library sortable (clone mode)
  new Sortable(componentsList, {
    group: {
      name: 'components',
      pull: 'clone',
      put: false
    },
    sort: false,
    animation: 150
  });

  // Make canvas sortable
  new Sortable(canvas, {
    group: {
      name: 'components',
      pull: false,
      put: true
    },
    animation: 150,
    onAdd: function(evt) {
      const componentId = evt.item.dataset.componentId;
      const component = availableComponents.find(c => c.id === componentId);
      
      // Replace the cloned item with our custom canvas item
      const canvasItem = createCanvasItem(component);
      evt.item.parentNode.replaceChild(canvasItem, evt.item);
      
      updateSelectedComponents();
      updateCanvasState();
    },
    onUpdate: function() {
      updateSelectedComponents();
    }
  });
}

// Create a canvas item element
function createCanvasItem(component) {
  const item = document.createElement('div');
  item.className = 'canvas-item';
  item.dataset.componentId = component.id;
  item.innerHTML = `
    <div class="canvas-item-name">${component.name}</div>
    <button class="canvas-item-remove" onclick="removeCanvasItem(this)">Remove</button>
  `;
  return item;
}

// Remove item from canvas
function removeCanvasItem(btn) {
  btn.closest('.canvas-item').remove();
  updateSelectedComponents();
  updateCanvasState();
}

// Update selected components array
function updateSelectedComponents() {
  selectedComponents = Array.from(canvas.querySelectorAll('.canvas-item'))
    .map(item => item.dataset.componentId);
}

// Update canvas visual state
function updateCanvasState() {
  const emptyState = canvas.querySelector('.empty-state');
  const hasItems = selectedComponents.length > 0;
  
  if (hasItems) {
    canvas.classList.add('has-items');
    if (emptyState) emptyState.remove();
  } else {
    canvas.classList.remove('has-items');
    if (!emptyState) {
      canvas.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📧</div>
          <p>Drag components from the left to start building</p>
        </div>
      `;
    }
  }
}

// Render preview
async function renderPreview() {
  try {
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ selectedComponents })
    });
    
    const data = await response.json();
    
    if (data.html) {
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewFrame.src = url;
    }
  } catch (error) {
    console.error('Error rendering preview:', error);
    alert('Error rendering preview. Check console for details.');
  }
}

// Export template
async function exportTemplate() {
  try {
    const filename = exportFilename.value || 'exported_template.html';
    
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        selectedComponents,
        filename 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Template exported successfully!\n\nSaved to: ${data.folder}/${data.filename}`);
      exportModal.classList.remove('active');
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error exporting:', error);
    alert('Error exporting template. Check console for details.');
  }
}

// Setup event listeners
function setupEventListeners() {
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all components from canvas?')) {
      canvas.innerHTML = '';
      selectedComponents = [];
      updateCanvasState();
      previewFrame.src = '';
    }
  });

  previewBtn.addEventListener('click', () => {
    if (selectedComponents.length === 0) {
      alert('Add some components to the canvas first!');
      return;
    }
    renderPreview();
  });

  refreshPreviewBtn.addEventListener('click', () => {
    if (selectedComponents.length > 0) {
      renderPreview();
    }
  });

  exportBtn.addEventListener('click', () => {
    if (selectedComponents.length === 0) {
      alert('Add some components to the canvas first!');
      return;
    }
    exportModal.classList.add('active');
  });

  cancelExportBtn.addEventListener('click', () => {
    exportModal.classList.remove('active');
  });

  confirmExportBtn.addEventListener('click', () => {
    exportTemplate();
  });
  // Close modal on outside click
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.remove('active');
    }
  });

  // Viewport toggle buttons
  mobileBtn.addEventListener('click', () => setViewport('mobile'));
  desktopBtn.addEventListener('click', () => setViewport('desktop'));
}

// Set viewport size
function setViewport(viewport) {
  currentViewport = viewport;
  
  // Update button states
  mobileBtn.classList.remove('active');
  desktopBtn.classList.remove('active');
  
  // Remove all viewport classes from iframe
  previewFrame.classList.remove('mobile-view', 'desktop-view');
  
  // Add active state and viewport class
  if (viewport === 'mobile') {
    mobileBtn.classList.add('active');
    previewFrame.classList.add('mobile-view');
  } else if (viewport === 'desktop') {
    desktopBtn.classList.add('active');
    previewFrame.classList.add('desktop-view');
  }
}

// Initialize app
init();
