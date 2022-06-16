var canvas = new fabric.StaticCanvas('c');
const DungeonFactory = require('dungeon-factory');

(canvas.renderOnAddRemove = false), (canvas.selection = false);
canvas.backgroundColor = '#3C3C3C';
canvas.setWidth($('#content').width());
canvas.setHeight($('#content').height());
fabric.Object.prototype.transparentCorners = false;

var knightplaced = false;
var knight = null;
var dungeon = null;
var finishplaced = false;
var finish = null;

var left = 0,
  right = 0,
  up = 0,
  down = 0;
var x, y;
var speed = 32;
function startGame() {
  dungeon = DungeonFactory.generate({
    width: 2 * Math.floor((canvas.width / 32 - 1) / 2) + 1,
    height: 2 * Math.floor((canvas.height / 32 - 1) / 2) + 1,
  });

  var elemcount = 0;
  for (var i = 0; i < dungeon.tiles.length; i++) {
    for (var j = 0; j < dungeon.tiles[i].length; j++) {
      if (knightplaced == false) {
        if (dungeon.tiles[i][j].type == 'floor') {
          knightplaced = true;
          createSprite('knight', i, j);
          x = i * 32;
          y = j * 32;
          console.log('k', x, y);
          elemcount++;
        }
      }
      if (dungeon.tiles[i][j].type == 'wall') {
        createSprite('wall', i, j);
        elemcount++;
      }

      if (dungeon.tiles[i][j].type == 'wall') {
        createSprite('wall', i, j);
        elemcount++;
      }

      if (dungeon.tiles[i][j].type == 'door') {
        createSprite('door', i, j);
        elemcount++;
      }
    }
  }
  for (var i = dungeon.tiles.length - 1; i >= 0; i--) {
    for (var j = dungeon.tiles[i].length - 1; j >= 0; j--) {
      if (finishplaced == false) {
        if (dungeon.tiles[i][j].type == 'floor') {
          dungeon.tiles[i][j].type = 'finish';
          finishplaced = true;
          createSprite('finish', i, j);
          elemcount++;
        }
      }
    }
  }

  var refreshIntervalId = setInterval(function () {
    if (canvas.getObjects().length == elemcount) {
      canvas.renderAll();
      clearInterval(refreshIntervalId);
      fabric.util.requestAnimFrame(render);
    }
  }, 1000);
}

function createSprite(type, left, top) {
  fabric.Image.fromURL('/img/' + type + '.png', function (img) {
    img.width = 32;
    img.height = 32;
    img.left = left * 32;
    img.top = top * 32;
    img.originX = 'left';
    img.originY = 'top';
    img.selectable = false;
    if (type == 'knight') {
      knight = img;
      console.log('knight');
    }
    canvas.add(img);
  });
}

$(document).keyup(function (e) {
  switch (e.which) {
    case 37: // left
      left = 0;
      break;

    case 38: // up
      up = 0;
      break;

    case 39: // right
      right = 0;
      break;

    case 40: // down
      down = 0;
      break;

    default:
      return; // exit this handler for other keys
  }

  /*
	console.log('UP',dungeon.tiles[i][j]);
	if (dungeon.tiles[i][j].type == 'finish'){
		console.log('RESTART  ---- ')
		knightplaced = false;
		finishplaced = false;
		knight = null;
		dungeon = null;
		canvas.clear();
		canvas.backgroundColor = '#3C3C3C';
		startGame();
	}*/
});

$(document).keydown(function (e) {
  switch (e.which) {
    case 37: // left
      left = 1;
      break;

    case 38: // up
      up = 1;
      break;

    case 39: // right
      right = 1;
      break;

    case 40: // down
      down = 1;
      break;

    default:
      return; // exit this handler for other keys
  }

  e.preventDefault(); // prevent the default action (scroll / move caret)
});

/*
$(document).keydown(function(e) {

	var i = knight.left / 32
	var j = knight.top / 32;

	console.log(i, j);
	console.log(e.which);
	canvas.add(knight);

	switch (e.which) {
		case 37: // left
			if (dungeon.tiles[i][j].nesw.west.type == 'floor' || dungeon.tiles[i][j].nesw.west.type == 'door' || dungeon.tiles[i][j].nesw.west.type == 'finish') {
				knight.left -= 32;
				canvas.renderAll();
			}
			break;

		case 38: // up
			if (dungeon.tiles[i][j].nesw.north.type == 'floor' || dungeon.tiles[i][j].nesw.north.type == 'door' || dungeon.tiles[i][j].nesw.north.type == 'finish') {
				knight.top -= 32;
				canvas.renderAll();
			}
			break;

		case 39: // right
			if (dungeon.tiles[i][j].nesw.east.type == 'floor' || dungeon.tiles[i][j].nesw.east.type == 'door' || dungeon.tiles[i][j].nesw.east.type == 'finish') {
				knight.left += 32;
				canvas.renderAll();
			}
			break;

		case 40: // down
			if (dungeon.tiles[i][j].nesw.south.type == 'floor' || dungeon.tiles[i][j].nesw.south.type == 'door' || dungeon.tiles[i][j].nesw.south.type == 'finish') {
				knight.top += 32;
				canvas.renderAll();
			}
			break;

		default:
			return; // exit this handler for other keys
	}


	
	e.preventDefault(); // prevent the default action (scroll / move caret)
});*/

$(document).ready(function () {
  console.log('START ---- ');
  startGame();
});

$('#generate').click(function () {
  console.log('RESTART  ---- ');
  knightplaced = false;
  knight = null;
  dungeon = null;
  canvas.clear();
  canvas.backgroundColor = '#3C3C3C';
  startGame();
});

var request;
var render = function () {
  var move_x = x + (right - left) * speed;
  var move_y = y + (down - up) * speed;

  console.log(move_x, move_y);
  console.log(dungeon.tiles[move_x / 32][move_y / 32]);

  if (
    dungeon.tiles[move_x / 32][move_y / 32].type == 'floor' ||
    dungeon.tiles[move_x / 32][move_y / 32].type == 'door' ||
    dungeon.tiles[move_x / 32][move_y / 32].type == 'finish'
  ) {
    x += (right - left) * speed;
    y += (down - up) * speed;
  }

  knight.left = x;
  knight.top = y;
  canvas.add(knight);
  canvas.renderAll();
  request = fabric.util.requestAnimFrame(render);
};
