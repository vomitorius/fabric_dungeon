import { Canvas, FabricImage, FabricObject } from 'fabric';
import Dungeoneer from 'dungeoneer';

// Initialize canvas
const canvas = new Canvas('c', {
  selection: false,
  backgroundColor: '#3C3C3C',
  renderOnAddRemove: false
});

// Calculate responsive canvas size - Improved for mobile
function getResponsiveCanvasSize() {
  const container = document.getElementById('content');
  const containerWidth = container.offsetWidth - 30; // Account for padding
  const containerHeight = window.innerHeight - 200; // Account for UI elements
  
  // Detect mobile portrait mode
  const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  
  if (isMobilePortrait) {
    // For mobile portrait, prioritize width and create a more square layout
    const maxSize = Math.min(containerWidth, containerHeight * 0.6);
    return {
      width: maxSize,
      height: Math.floor(maxSize * 0.85) // Slightly taller than wide for mobile
    };
  } else {
    // For desktop/landscape, use existing logic
    const maxWidth = Math.min(containerWidth, 1050);
    let width = maxWidth;
    let height = Math.floor(maxWidth * 0.67); // Roughly 3:2 aspect ratio
    
    // Ensure it fits in viewport height
    if (height > containerHeight) {
      height = containerHeight;
      width = Math.floor(height * 1.5);
    }
    
    // Ensure minimum viable size
    const minTileSize = 16;
    const minGridWidth = 21;
    const minGridHeight = 15;
    
    if (width < minGridWidth * minTileSize) {
      width = minGridWidth * minTileSize;
    }
    if (height < minGridHeight * minTileSize) {
      height = minGridHeight * minTileSize;
    }
    
    return { width, height };
  }
}

// Set responsive canvas size
function setResponsiveCanvasSize() {
  const { width, height } = getResponsiveCanvasSize();
  canvas.setWidth(width);
  canvas.setHeight(height);
  
  // Update CSS to ensure proper scaling
  const canvasElement = document.getElementById('c');
  canvasElement.style.maxWidth = '100%';
  canvasElement.style.height = 'auto';
}

// Initialize canvas size
setResponsiveCanvasSize();

// Make canvas globally accessible for debugging
window.fabricCanvas = canvas;

// Set default object properties
FabricObject.prototype.transparentCorners = false;

// Game state
let knightPlaced = false;
let knight = null;
let dungeon = null;
let finishPlaced = false;
let tileSize = 32;

// Movement state
let left = 0, right = 0, up = 0, down = 0;
let x, y;
let speed = tileSize;

// Touch and gamepad state
let touchStartX = null;
let touchStartY = null;
let gamepadPressed = new Set();
let keyPressed = new Set();

// Calculate optimal tile size based on canvas size - Improved for mobile
function calculateTileSize() {
  const { width, height } = getResponsiveCanvasSize();
  const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  
  if (isMobilePortrait) {
    // For mobile, use larger tiles for better visibility
    // Aim for around 15x13 grid on mobile for better playability
    let preferredTileSize = Math.min(
      Math.floor(width / 15),  // 15 tiles wide
      Math.floor(height / 13)  // 13 tiles high
    );
    
    // Ensure mobile tiles are at least 20px for touch interaction
    preferredTileSize = Math.max(20, Math.min(preferredTileSize, 40));
    return preferredTileSize;
  } else {
    // Desktop logic - allow for more tiles and smaller sizes
    let preferredTileSize = Math.min(
      Math.floor(width / 33), // 33 tiles wide maximum
      Math.floor(height / 23)  // 23 tiles high maximum
    );
    
    // Ensure reasonable bounds for desktop
    preferredTileSize = Math.max(16, Math.min(preferredTileSize, 48));
    return preferredTileSize;
  }
}

async function startGame() {
  console.log('Starting new game...');
  
  // Calculate responsive tile size and canvas size
  tileSize = calculateTileSize();
  speed = tileSize;
  setResponsiveCanvasSize();
  
  // Generate dungeon using dungeoneer with responsive dimensions
  const maxTilesWidth = Math.floor(canvas.width / tileSize);
  const maxTilesHeight = Math.floor(canvas.height / tileSize);
  
  // Ensure odd dimensions for proper maze generation and reasonable minimums
  const dungeonWidth = Math.max(15, 2 * Math.floor((maxTilesWidth - 1) / 2) + 1);
  const dungeonHeight = Math.max(11, 2 * Math.floor((maxTilesHeight - 1) / 2) + 1);

  console.log(`Generating dungeon: ${dungeonWidth}x${dungeonHeight}, tileSize: ${tileSize}`);

  try {
    dungeon = Dungeoneer.build({
      width: dungeonWidth,
      height: dungeonHeight,
    });
  } catch (error) {
    console.error('Failed to generate dungeon:', error);
    return;
  }

  if (!dungeon || !dungeon.tiles) {
    console.error('Invalid dungeon generated');
    return;
  }

  // Collect all sprites to create in parallel
  const spritesToCreate = [];
  let knightPlacementFound = false;
  let finishPlacementFound = false;
  
  // Place knight at first floor tile
  for (let i = 0; i < dungeon.tiles.length && !knightPlacementFound; i++) {
    for (let j = 0; j < dungeon.tiles[i].length && !knightPlacementFound; j++) {
      if (dungeon.tiles[i][j].type === 'floor') {
        knightPlacementFound = true;
        knightPlaced = true;
        spritesToCreate.push({ type: 'knight', x: i, y: j, isKnight: true });
        x = i * tileSize;
        y = j * tileSize;
        console.log('Knight will be placed at grid:', i, j, 'pixels:', x, y);
      }
    }
  }
  
  // Add walls and doors
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (dungeon.tiles[i][j].type === 'wall') {
        spritesToCreate.push({ type: 'wall', x: i, y: j });
      } else if (dungeon.tiles[i][j].type === 'door') {
        spritesToCreate.push({ type: 'door', x: i, y: j });
      }
    }
  }
  
  // Place finish at last floor tile (search from bottom-right)
  for (let i = dungeon.tiles.length - 1; i >= 0 && !finishPlacementFound; i--) {
    for (let j = dungeon.tiles[i].length - 1; j >= 0 && !finishPlacementFound; j--) {
      if (dungeon.tiles[i][j].type === 'floor') {
        // Make sure it's not the knight's position
        if (!(i * tileSize === x && j * tileSize === y)) {
          dungeon.tiles[i][j].type = 'finish';
          finishPlacementFound = true;
          finishPlaced = true;
          spritesToCreate.push({ type: 'finish', x: i, y: j });
          console.log('Finish will be placed at grid:', i, j);
        }
      }
    }
  }

  if (!knightPlacementFound) {
    console.error('Could not place knight - no floor tiles found!');
    return;
  }

  if (!finishPlacementFound) {
    console.error('Could not place finish - no suitable floor tiles found!');
    return;
  }

  console.log(`Creating ${spritesToCreate.length} sprites in batches...`);
  
  // Create sprites in parallel batches for better performance
  const batchSize = 20;
  for (let i = 0; i < spritesToCreate.length; i += batchSize) {
    const batch = spritesToCreate.slice(i, i + batchSize);
    
    // Process batch in parallel
    const spritePromises = batch.map(sprite => 
      createSpriteOptimized(sprite.type, sprite.x, sprite.y, sprite.isKnight)
    );
    
    await Promise.all(spritePromises);
  }

  console.log('All sprites created, rendering canvas...');
  // Render the canvas after all images are loaded
  canvas.renderAll();
  requestAnimationFrame(render);
}

async function createSpriteOptimized(type, left, top, isKnight = false) {
  try {
    const img = await FabricImage.fromURL(`/img/${type}.png`, {
      crossOrigin: 'anonymous'
    });
    
    // Ensure proper sprite sizing and centering
    img.set({
      width: tileSize,
      height: tileSize,
      left: left * tileSize,
      top: top * tileSize,
      originX: 'left',
      originY: 'top',
      selectable: false,
      // Ensure sprites scale properly and maintain aspect ratio
      scaleX: tileSize / img.width,
      scaleY: tileSize / img.height
    });
    
    if (isKnight) {
      knight = img;
      console.log('Knight sprite created and assigned');
    }
    
    canvas.add(img);
    return img;
  } catch (error) {
    console.error(`Failed to load image: ${type}`, error);
    return null;
  }
}

async function createSprite(type, left, top) {
  console.log(`Creating sprite: ${type} at ${left}, ${top}`);
  try {
    const img = await FabricImage.fromURL(`/img/${type}.png`, {
      crossOrigin: 'anonymous'
    });
    console.log(`Image loaded: ${type}`, img);
    
    // Ensure proper sprite sizing and centering
    img.set({
      width: tileSize,
      height: tileSize,
      left: left * tileSize,
      top: top * tileSize,
      originX: 'left',
      originY: 'top',
      selectable: false,
      // Ensure sprites scale properly and maintain aspect ratio
      scaleX: tileSize / img.width,
      scaleY: tileSize / img.height
    });
    
    if (type === 'knight') {
      knight = img;
      console.log('Knight sprite created and assigned');
    }
    
    canvas.add(img);
    console.log(`Added ${type} to canvas, total objects:`, canvas.getObjects().length);
  } catch (error) {
    console.error(`Failed to load image: ${type}`, error);
  }
}

// Keyboard event handlers - Single-step movement
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowRight':
    case 'ArrowDown':
      keyPressed.delete(e.code);
      break;
  }
});

document.addEventListener('keydown', (e) => {
  // Prevent repeated keydown events while holding key
  if (keyPressed.has(e.code)) {
    e.preventDefault();
    return;
  }
  
  keyPressed.add(e.code);
  
  switch (e.code) {
    case 'ArrowLeft':
      triggerSingleStepMovement('left');
      break;
    case 'ArrowUp':
      triggerSingleStepMovement('up');
      break;
    case 'ArrowRight':
      triggerSingleStepMovement('right');
      break;
    case 'ArrowDown':
      triggerSingleStepMovement('down');
      break;
  }
  e.preventDefault();
});

// Touch event handlers for swipe gestures
const canvasElement = document.getElementById('c');

canvasElement.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: false });

canvasElement.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

canvasElement.addEventListener('touchend', (e) => {
  e.preventDefault();
  
  if (touchStartX === null || touchStartY === null) {
    return;
  }
  
  const touch = e.changedTouches[0];
  const touchEndX = touch.clientX;
  const touchEndY = touch.clientY;
  
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  
  // Minimum swipe distance
  const minSwipeDistance = 30;
  
  if (Math.abs(diffX) > Math.abs(diffY)) {
    // Horizontal swipe
    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swipe left
        triggerSingleStepMovement('left');
      } else {
        // Swipe right
        triggerSingleStepMovement('right');
      }
    }
  } else {
    // Vertical swipe
    if (Math.abs(diffY) > minSwipeDistance) {
      if (diffY > 0) {
        // Swipe up
        triggerSingleStepMovement('up');
      } else {
        // Swipe down
        triggerSingleStepMovement('down');
      }
    }
  }
  
  touchStartX = null;
  touchStartY = null;
}, { passive: false });

// Virtual gamepad event handlers
const gamepadButtons = document.querySelectorAll('.dpad-btn');

gamepadButtons.forEach(button => {
  const direction = button.dataset.direction;
  if (!direction) return;
  
  // Use click for single-step movement instead of continuous press
  button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    button.classList.add('active');
    // Trigger single movement step
    triggerSingleStepMovement(direction);
  });
  
  button.addEventListener('touchend', (e) => {
    e.preventDefault();
    button.classList.remove('active');
  });
  
  button.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    button.classList.remove('active');
  });
  
  // Also support mouse events for desktop testing
  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
    button.classList.add('active');
    // Trigger single movement step
    triggerSingleStepMovement(direction);
  });
  
  button.addEventListener('mouseup', (e) => {
    e.preventDefault();
    button.classList.remove('active');
  });
  
  button.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    button.classList.remove('active');
  });
});

// Helper functions for movement
function setDirectionState(direction, state) {
  switch (direction) {
    case 'left':
      left = state;
      break;
    case 'up':
      up = state;
      break;
    case 'right':
      right = state;
      break;
    case 'down':
      down = state;
      break;
  }
}

function triggerMovement(direction) {
  // Quick movement trigger for swipe gestures
  setDirectionState(direction, 1);
  setTimeout(() => {
    setDirectionState(direction, 0);
  }, 100);
}

function triggerSingleStepMovement(direction) {
  // Single step movement for touch controls
  if (!knight || !dungeon) {
    console.log('Movement attempted but game not ready');
    return;
  }

  let newX = x;
  let newY = y;
  
  switch (direction) {
    case 'left':
      newX = x - speed;
      break;
    case 'up':
      newY = y - speed;
      break;
    case 'right':
      newX = x + speed;
      break;
    case 'down':
      newY = y + speed;
      break;
  }
  
  const moveX = Math.floor(newX / tileSize);
  const moveY = Math.floor(newY / tileSize);
  
  // Check bounds and tile type
  if (moveX >= 0 && moveX < dungeon.tiles.length && 
      moveY >= 0 && moveY < dungeon.tiles[moveX].length) {
    
    const tileType = dungeon.tiles[moveX][moveY].type;
    
    if (tileType === 'floor' || tileType === 'door' || tileType === 'finish') {
      x = newX;
      y = newY;
      
      knight.set({
        left: x,
        top: y
      });
      
      canvas.renderAll();
      
      // Check for win condition
      if (tileType === 'finish') {
        console.log('You win! Generating new dungeon...');
        // Prevent multiple triggers by temporarily disabling movement
        const originalKnight = knight;
        knight = null;
        
        setTimeout(async () => {
          resetGame();
          await startGame();
        }, 1000);
      }
    }
  }
}

// Game render loop - Updated for single-step keyboard movement
function render() {
  if (!knight || !dungeon) {
    requestAnimationFrame(render);
    return;
  }

  // No continuous movement needed since both keyboard and touch use single-step
  knight.set({
    left: x,
    top: y
  });
  
  canvas.renderAll();
  requestAnimationFrame(render);
}

function resetGame() {
  console.log('Resetting game state...');
  
  // Reset game state flags
  knightPlaced = false;
  finishPlaced = false;
  knight = null;
  dungeon = null;
  
  // Reset movement states
  left = 0; 
  right = 0; 
  up = 0; 
  down = 0;
  
  // Clear keyboard state
  keyPressed.clear();
  
  // Clear canvas completely
  canvas.clear();
  canvas.backgroundColor = '#3C3C3C';
  
  // Reset position coordinates
  x = 0;
  y = 0;
  
  console.log('Game state reset complete');
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Starting Fabric Dungeon...');
  await startGame();
});

// Generate button handler
document.getElementById('generate').addEventListener('click', async () => {
  console.log('Generating new dungeon...');
  resetGame();
  await startGame();
});

// Handle window resize - Fixed to prevent endless regeneration
let resizeTimeout = null;
window.addEventListener('resize', () => {
  // Debounce resize events to prevent excessive regeneration
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  
  resizeTimeout = setTimeout(() => {
    const newTileSize = calculateTileSize();
    const sizeDifference = Math.abs(newTileSize - tileSize);
    
    // Only regenerate if there's a significant size change (more than 4px difference)
    if (sizeDifference > 4) {
      console.log(`Size change detected: ${tileSize} -> ${newTileSize}, regenerating game...`);
      resetGame();
      setTimeout(async () => {
        await startGame();
      }, 100);
    } else {
      // Just resize canvas without regenerating
      console.log('Minor size change, just resizing canvas...');
      setResponsiveCanvasSize();
      canvas.renderAll();
    }
  }, 250); // 250ms debounce
});