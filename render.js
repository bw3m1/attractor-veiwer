// Global references
const canvas = document.getElementById('attractorCanvas');
const ctx = canvas.getContext('2d');
const lineSelect = document.getElementById('lineSelect');
const drawBtn = document.getElementById('drawBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const iterationsSlider = document.getElementById('iterationsSlider');
const iterationsValue = document.getElementById('iterationsValue');

// Parameters cache
let parametersCache = [];
let isDrawing = false;

// Helper function to clamp values
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// Initialize the app
async function init() {
    try {
        statusEl.textContent = 'Loading parameters...';
        parametersCache = await fetchParameters();
        populateSelect();
        updateIterationsValue();
        
        drawBtn.addEventListener('click', drawSelected);
        saveBtn.addEventListener('click', saveImage);
        iterationsSlider.addEventListener('input', updateIterationsValue);
        
        statusEl.textContent = `Loaded ${parametersCache.length} attractors. Select one to draw.`;
    } catch (error) {
        console.error('Initialization error:', error);
        statusEl.textContent = 'Failed to load parameters. See console for details.';
    }
}

// Update iterations display
function updateIterationsValue() {
    const exponent = parseFloat(iterationsSlider.value);
    const iterations = Math.pow(10, exponent);
    iterationsValue.textContent = iterations.toLocaleString() + ' iterations';
}

// Fetch and parse parameters
async function fetchParameters() {
    return attractorData;
}

// Populate the dropdown
function populateSelect() {
    lineSelect.innerHTML = '';
    parametersCache.forEach((params, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Attractor ${index + 1}`;
        lineSelect.appendChild(option);
    });
}

// Draw selected attractor
async function drawSelected() {
    if (isDrawing) return;
    
    const index = parseInt(lineSelect.value);
    if (isNaN(index) || index < 0 || index >= parametersCache.length) {
        statusEl.textContent = 'Invalid selection';
        return;
    }
    
    try {
        isDrawing = true;
        drawBtn.disabled = true;
        statusEl.textContent = 'Initializing...';
        progressBar.style.width = '0%';
        
        const exponent = parseFloat(iterationsSlider.value);
        const iterations = Math.pow(10, exponent);
        const params = parametersCache[index];
        
        await draw(params, iterations);
        
        statusEl.textContent = `Rendering completed! Attractor ${index + 1}`;
    } catch (error) {
        console.error('Drawing error:', error);
        statusEl.textContent = 'Error during drawing. See console for details.';
    } finally {
        isDrawing = false;
        drawBtn.disabled = false;
    }
}

// Core drawing function
async function draw(parameters, iterations) {
    const [xInit, yInit, a] = parameters;
    const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11] = a;
    
    // Initialize starting position
    let x = xInit;
    let y = yInit;

    // Initialize bounds tracking
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    // Warm-up phase to find stable bounds (100 iterations)
    for (let i = 0; i < 100; i++) {
        const xnew = a0 + a1*x + a2*x*x + a3*y + a4*y*y + a5*x*y;
        const ynew = a6 + a7*x + a8*x*x + a9*y + a10*y*y + a11*x*y;
        
        if (isFinite(xnew) && isFinite(ynew) && 
            Math.abs(xnew) < 1e6 && Math.abs(ynew) < 1e6) {
            x = xnew;
            y = ynew;
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
        }
    }

    // Add padding to bounds (10%)
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;
    xMin -= xPadding;
    xMax += xPadding;
    yMin -= yPadding;
    yMax += yPadding;

    // Reset position for main drawing
    x = xInit;
    y = yInit;

    // Calculate ranges
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // Clear canvas with pure black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate dimensions maintaining 14080:10560 aspect ratio (4:3)
    const aspectRatio = 4/3;
    let bufferWidth, bufferHeight;
    
    if (canvas.width / canvas.height > aspectRatio) {
        // Canvas is wider than target ratio
        bufferHeight = canvas.height;
        bufferWidth = Math.floor(canvas.height * aspectRatio);
    } else {
        // Canvas is taller than target ratio
        bufferWidth = canvas.width;
        bufferHeight = Math.floor(canvas.width / aspectRatio);
    }
    
    // Create buffer with proper aspect ratio
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = bufferWidth;
    bufferCanvas.height = bufferHeight;
    const bufferCtx = bufferCanvas.getContext('2d');
    
    // Initialize buffer to black
    bufferCtx.fillStyle = 'black';
    bufferCtx.fillRect(0, 0, bufferWidth, bufferHeight);
    
    // Set up semi-transparent points for better density appearance
    bufferCtx.globalAlpha = 0.3;
    bufferCtx.fillStyle = '#00FF9D';

    // Process points in batches
    const batchSize = 100000;
    const pointSize = 5; // Smaller point size to match Python
    
    // Main iteration loop
    for (let i = 0; i < iterations; i += batchSize) {
        const currentBatch = Math.min(batchSize, iterations - i);
        
        for (let j = 0; j < currentBatch; j++) {
            const xnew = a0 + a1*x + a2*x*x + a3*y + a4*y*y + a5*x*y;
            const ynew = a6 + a7*x + a8*x*x + a9*y + a10*y*y + a11*x*y;
            
            // Skip if points are invalid or too extreme
            if (!isFinite(xnew) || !isFinite(ynew) || 
                Math.abs(xnew) > 1e6 || Math.abs(ynew) > 1e6) {
                x = xInit;
                y = yInit;
                continue;
            }
            
            // Clamp the values to prevent extreme points
            x = clamp(xnew, xMin * 1.5, xMax * 1.5);
            y = clamp(ynew, yMin * 1.5, yMax * 1.5);

            // Scale to proper dimensions
            const xScaled = ((x - xMin) / xRange) * bufferWidth;
            const yScaled = ((yMax - y) / yRange) * bufferHeight;
            
            if (xScaled >= 0 && xScaled < bufferWidth && yScaled >= 0 && yScaled < bufferHeight) {
                bufferCtx.fillRect(xScaled, yScaled, pointSize, pointSize);
            }
        }

        // Reset alpha for the canvas copy
        bufferCtx.globalAlpha = 1.0;
        
        // Draw the buffer centered on the canvas
        const xOffset = Math.floor((canvas.width - bufferWidth) / 2);
        const yOffset = Math.floor((canvas.height - bufferHeight) / 2);
        ctx.drawImage(bufferCanvas, xOffset, yOffset);
        
        // Reset alpha for next batch
        bufferCtx.globalAlpha = 0.3;

        // Update progress and render current state
        const progress = (i + currentBatch) / iterations;
        progressBar.style.width = `${Math.round(progress * 100)}%`;
        statusEl.textContent = `Calculating points: ${Math.round(progress * 100)}%`;
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

// Save image
function saveImage() {
    const link = document.createElement('a');
    link.download = `attractor-${lineSelect.value}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Initialize the app
init();