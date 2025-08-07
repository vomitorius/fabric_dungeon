import { Canvas, FabricImage, FabricObject } from 'fabric';
import Dungeoneer from 'dungeoneer';

// Initialize canvas
const canvas = new Canvas('c', {
  selection: false,
  backgroundColor: '#3C3C3C',
  renderOnAddRemove: false
});

// Calculate responsive canvas size
function getResponsiveCanvasSize() {
  const container = document.getElementById('content');
  const containerWidth = container.offsetWidth - 30; // Account for padding
  const maxWidth = Math.min(containerWidth, 1050);
  
  // Maintain aspect ratio but adapt to screen
  let width = maxWidth;
  let height = Math.floor(maxWidth * 0.67); // Roughly 3:2 aspect ratio
  
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

// Calculate optimal tile size based on canvas size
function calculateTileSize() {
  const { width, height } = getResponsiveCanvasSize();
  
  // Aim for a reasonable grid size (e.g., 21x15 minimum)
  const maxTilesWidth = Math.floor(width / 16); // Minimum 16px tiles
  const maxTilesHeight = Math.floor(height / 16);
  
  // But prefer larger tiles on bigger screens
  let preferredTileSize = Math.min(
    Math.floor(width / 33), // 33 tiles wide maximum
    Math.floor(height / 23)  // 23 tiles high maximum
  );
  
  // Ensure reasonable bounds
  preferredTileSize = Math.max(16, Math.min(preferredTileSize, 48));
  
  return preferredTileSize;
}

async function startGame() {
  // Calculate responsive tile size and canvas size
  tileSize = calculateTileSize();
  speed = tileSize;
  setResponsiveCanvasSize();
  
  // Generate dungeon using dungeoneer with responsive dimensions
  const maxTilesWidth = Math.floor(canvas.width / tileSize);
  const maxTilesHeight = Math.floor(canvas.height / tileSize);
  
  // Ensure odd dimensions for proper maze generation
  const dungeonWidth = 2 * Math.floor((maxTilesWidth - 1) / 2) + 1;
  const dungeonHeight = 2 * Math.floor((maxTilesHeight - 1) / 2) + 1;

  dungeon = Dungeoneer.build({
    width: Math.max(21, dungeonWidth), // Minimum playable size
    height: Math.max(15, dungeonHeight),
  });

  let elemCount = 0;
  
  // Place knight at first floor tile
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (!knightPlaced && dungeon.tiles[i][j].type === 'floor') {
        knightPlaced = true;
        await createSprite('knight', i, j);
        x = i * tileSize;
        y = j * tileSize;
        console.log('Knight placed at:', x, y);
        elemCount++;
      }
      
      if (dungeon.tiles[i][j].type === 'wall') {
        await createSprite('wall', i, j);
        elemCount++;
      }
      
      if (dungeon.tiles[i][j].type === 'door') {
        await createSprite('door', i, j);
        elemCount++;
      }
    }
  }
  
  // Place finish at last floor tile
  for (let i = dungeon.tiles.length - 1; i >= 0; i--) {
    for (let j = dungeon.tiles[i].length - 1; j >= 0; j--) {
      if (!finishPlaced && dungeon.tiles[i][j].type === 'floor') {
        dungeon.tiles[i][j].type = 'finish';
        finishPlaced = true;
        await createSprite('finish', i, j);
        elemCount++;
        break;
      }
    }
    if (finishPlaced) break;
  }

  // Render the canvas after all images are loaded
  canvas.renderAll();
  requestAnimationFrame(render);
}

async function createSprite(type, left, top) {
  console.log(`Creating sprite: ${type} at ${left}, ${top}`);
  try {
    const img = await FabricImage.fromURL(`/img/${type}.png`, {
      crossOrigin: 'anonymous'
    });
    console.log(`Image loaded: ${type}`, img);
    img.set({
      width: tileSize,
      height: tileSize,
      left: left * tileSize,
      top: top * tileSize,
      originX: 'left',
      originY: 'top',
      selectable: false
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

// Keyboard event handlers
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
      left = 0;
      break;
    case 'ArrowUp':
      up = 0;
      break;
    case 'ArrowRight':
      right = 0;
      break;
    case 'ArrowDown':
      down = 0;
      break;
  }
});

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
      left = 1;
      break;
    case 'ArrowUp':
      up = 1;
      break;
    case 'ArrowRight':
      right = 1;
      break;
    case 'ArrowDown':
      down = 1;
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
        triggerMovement('left');
      } else {
        // Swipe right
        triggerMovement('right');
      }
    }
  } else {
    // Vertical swipe
    if (Math.abs(diffY) > minSwipeDistance) {
      if (diffY > 0) {
        // Swipe up
        triggerMovement('up');
      } else {
        // Swipe down
        triggerMovement('down');
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
  
  button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    gamepadPressed.add(direction);
    setDirectionState(direction, 1);
    button.classList.add('active');
  });
  
  button.addEventListener('touchend', (e) => {
    e.preventDefault();
    gamepadPressed.delete(direction);
    setDirectionState(direction, 0);
    button.classList.remove('active');
  });
  
  button.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    gamepadPressed.delete(direction);
    setDirectionState(direction, 0);
    button.classList.remove('active');
  });
  
  // Also support mouse events for desktop testing
  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
    gamepadPressed.add(direction);
    setDirectionState(direction, 1);
    button.classList.add('active');
  });
  
  button.addEventListener('mouseup', (e) => {
    e.preventDefault();
    gamepadPressed.delete(direction);
    setDirectionState(direction, 0);
    button.classList.remove('active');
  });
  
  button.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    gamepadPressed.delete(direction);
    setDirectionState(direction, 0);
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

// Game render loop
function render() {
  if (!knight || !dungeon) {
    requestAnimationFrame(render);
    return;
  }

  const moveX = Math.floor((x + (right - left) * speed) / tileSize);
  const moveY = Math.floor((y + (down - up) * speed) / tileSize);

  // Check bounds and tile type
  if (moveX >= 0 && moveX < dungeon.tiles.length && 
      moveY >= 0 && moveY < dungeon.tiles[moveX].length) {
    
    const tileType = dungeon.tiles[moveX][moveY].type;
    
    if (tileType === 'floor' || tileType === 'door' || tileType === 'finish') {
      x += (right - left) * speed;
      y += (down - up) * speed;
      
      // Check for win condition
      if (tileType === 'finish') {
        console.log('You win! Generating new dungeon...');
        setTimeout(async () => {
          resetGame();
          await startGame();
        }, 1000);
      }
    }
  }

  knight.set({
    left: x,
    top: y
  });
  
  canvas.renderAll();
  requestAnimationFrame(render);
}

function resetGame() {
  knightPlaced = false;
  finishPlaced = false;
  knight = null;
  dungeon = null;
  canvas.clear();
  canvas.backgroundColor = '#3C3C3C';
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

// Handle window resize
window.addEventListener('resize', () => {
  // Recalculate tile size and canvas dimensions
  const newTileSize = calculateTileSize();
  
  if (newTileSize !== tileSize) {
    // Only regenerate if tile size changed significantly
    console.log('Significant size change detected, regenerating game...');
    resetGame();
    setTimeout(async () => {
      await startGame();
    }, 100);
  } else {
    // Just resize canvas
    setResponsiveCanvasSize();
    canvas.renderAll();
  }
});