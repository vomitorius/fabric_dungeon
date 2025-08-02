import * as fabric from 'fabric';
import Dungeoneer from 'dungeoneer';

// Initialize canvas
const canvas = new fabric.StaticCanvas('c');
canvas.renderOnAddRemove = false;
canvas.selection = false;
canvas.backgroundColor = '#3C3C3C';

// Make canvas responsive to container
const container = document.getElementById('content');
canvas.setWidth(container.offsetWidth);
canvas.setHeight(container.offsetHeight);

// Make canvas globally accessible for debugging
window.fabricCanvas = canvas;

fabric.Object.prototype.transparentCorners = false;

// Game state
let knightPlaced = false;
let knight = null;
let dungeon = null;
let finishPlaced = false;

// Movement state
let left = 0, right = 0, up = 0, down = 0;
let x, y;
const speed = 32;

function startGame() {
  // Generate dungeon using dungeoneer
  dungeon = Dungeoneer.build({
    width: 2 * Math.floor((canvas.width / 32 - 1) / 2) + 1,
    height: 2 * Math.floor((canvas.height / 32 - 1) / 2) + 1,
  });

  let elemCount = 0;
  
  // Place knight at first floor tile
  for (let i = 0; i < dungeon.tiles.length; i++) {
    for (let j = 0; j < dungeon.tiles[i].length; j++) {
      if (!knightPlaced && dungeon.tiles[i][j].type === 'floor') {
        knightPlaced = true;
        createSprite('knight', i, j);
        x = i * 32;
        y = j * 32;
        console.log('Knight placed at:', x, y);
        elemCount++;
      }
      
      if (dungeon.tiles[i][j].type === 'wall') {
        createSprite('wall', i, j);
        elemCount++;
      }
      
      if (dungeon.tiles[i][j].type === 'door') {
        createSprite('door', i, j);
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
        createSprite('finish', i, j);
        elemCount++;
        break;
      }
    }
    if (finishPlaced) break;
  }

  // Wait for all sprites to load before rendering
  const renderInterval = setInterval(() => {
    if (canvas.getObjects().length === elemCount) {
      canvas.renderAll();
      clearInterval(renderInterval);
      requestAnimationFrame(render);
    }
  }, 100);
}

function createSprite(type, left, top) {
  console.log(`Creating sprite: ${type} at ${left}, ${top}`);
  fabric.Image.fromURL(`/img/${type}.png`, (img) => {
    console.log(`Image loaded: ${type}`, img);
    img.set({
      width: 32,
      height: 32,
      left: left * 32,
      top: top * 32,
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
  }, { crossOrigin: 'anonymous' });
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

// Game render loop
function render() {
  if (!knight || !dungeon) {
    requestAnimationFrame(render);
    return;
  }

  const moveX = Math.floor((x + (right - left) * speed) / 32);
  const moveY = Math.floor((y + (down - up) * speed) / 32);

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
        setTimeout(() => {
          resetGame();
          startGame();
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
document.addEventListener('DOMContentLoaded', () => {
  console.log('Starting Fabric Dungeon...');
  startGame();
});

// Generate button handler
document.getElementById('generate').addEventListener('click', () => {
  console.log('Generating new dungeon...');
  resetGame();
  startGame();
});

// Handle window resize
window.addEventListener('resize', () => {
  const container = document.getElementById('content');
  canvas.setWidth(container.offsetWidth);
  canvas.setHeight(container.offsetHeight);
  canvas.renderAll();
});