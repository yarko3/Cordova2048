function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator = new Actuator;
  

  //start with all but 1 tile
  this.startTiles     = size*size-1;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("dfs", this.startIDDFS.bind(this));
  this.inputManager.on("solve", this.solve.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.traversing = false;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.traversing = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
      //no longer adding radnom tiles but ones that correspond to i
      this.addNumberedTile(i);
  }
};

//add a numbered tile in a random position
GameManager.prototype.addNumberedTile = function (i) {
    if (this.grid.cellsAvailable()) {
        var value = i;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
}


// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
    //now we care about having a lower score and being in a win state
  if (this.storageManager.getBestScore() > this.score && this.won) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    traversed:  this.traversed
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
    //clear previously occupied space
    this.grid.cells[tile.x][tile.y] = null;
    //update blank
    this.grid.blank = { x: tile.x, y: tile.y };
    //place tile in new locale
    this.grid.cells[cell.x][cell.y] = tile;
    //update tile coordinates
    tile.updatePosition(cell);
};

//fill puzzle with solution state
GameManager.prototype.solve = function () {
    this.grid.fillWithSolution();
    this.won = true;
    this.actuate();
}

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();
    
  //the blank
  var blank = self.grid.getBlank();

    //the the (at most) 1 tile required to move
    //will be the opposite side of the vector

  var xToCheck = blank.x - vector.x;
  var yToCheck = blank.y - vector.y;

  var cellToCheck = { x: xToCheck, y: yToCheck };

    //if this cell can be moved, move it
  if (this.grid.withinBounds(cellToCheck))
  {
      cell = { x: cellToCheck.x, y: cellToCheck.y };
      tile = self.grid.cellContent(cell);

      //move the tile to as far as it can go
      self.moveTile(tile, blank);

      //have we moved?
      if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!

          //update blank
          this.grid.blank = cell;
          // Update the score (only want to update score once)
          self.score += 1;
      }

  }
    //if we moved, reactuate
  if (moved) {
      //check for goal state
      this.won = this.grid.atGoalState();

      this.actuate();
  }
};



// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable();
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

//perform iterative-deepening depth first search until stop button pressed
GameManager.prototype.startIDDFS = function () {

    //check IDDFS counter (this is due to the fact that this function is called twice every time it is pressed)
    if (this.traversed == true) {
        this.traversed = false;
        return;
    }
    //check if we're currently not already traversing
    if (!this.traversing)
    {
        //use this.traversing as a semaphore
        this.traversing = true;
        //the depth of depth-bounded DFS
        var depth = 1;

        //perform dfs until we've found a solution and we're still traversing
        while (!this.won && this.traversing && depth < 5)
        {
            this.DFS(depth);

            console.log("DFS got through depth: " + depth);
            depth++;
        }

        //set flag for outputting to screen 
        this.traversed = true;

        //actuate for message on screen
        this.actuate();

        //release semaphore
        this.traversing = false;

        //remove flag for message (otherwise it will sometimes show up again)
        this.traversed = false;
    }
};



//perform depth-bounded depth first search
GameManager.prototype.DFS = function (depth) {
    //check if we've found a solution, stop
    if (this.grid.atGoalState()) {
        this.won = true;
        return;
    }
    //we aren't at a solution state, so see if we can make moves with given depth
    //or if we don't wanna traverse anymore
    if (depth <= 0 || !this.traversing)
        return;

    //get available moves
    //first must get blank
    var blank = this.grid.getBlank();
    var newDepth = depth - 1;
    
    //can we move tile down?
    if (blank.y > 0)
    {
        //perform move
        this.move(2);
        this.DFS(newDepth);

        //if we're not at a solution, undo move
        if (this.won)
            return;

        this.move(0);
    }

    //can we move the blank down?
    if (blank.y < this.size-1) {
        //perform move
        this.move(0);
        this.DFS(newDepth);

        //if we're not at a solution, undo move
        if (this.won)
            return;

        this.move(2);
    }

    //can we move a tile right?
    if (blank.x > 0) {
        //perform move
        this.move(1);
        this.DFS(newDepth);

        //if we're not at a solution, undo move
        if (this.won)
            return;

        this.move(3);
    }

    //can we move the blank right?
    if (blank.x < this.size-1) {
        //perform move
        this.move(3);
        this.DFS(newDepth);

        //if we're not at a solution, undo move
        if (this.won)
            return;

        this.move(1);
    }
    
};

//This heuristic evaluation in the Manhattan distance
GameManager.prototype.manhattanHeuristic = function () {
    //our score to return
    var rtn = 0;

    //for every space on the board, measure the steps to its goal position
    for (var i = 0; i < this.size; i++) {
        for (var j = 0; j < this.size; j++) {
            //whatever is at this location
            var cell = this.grid.cells[i][j];

            //check if this location is a tile or a blank
            if (this.grid.cellOccupied(cell)) {
                //get the value of the cell
                var cellValue = cell.value;

                var goalX = cellValue % this.size;
                var goalY = cellValue / this.size;

                //add to overall distance
                rtn += Math.abs(goalX - j) + Math.abs(goalY - i);
            }
        }
    }

    return rtn;

};
