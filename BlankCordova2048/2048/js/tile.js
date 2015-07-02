function Tile(position, value) {
  this.x                = position.x;
  this.y                = position.y;
  this.value            = value;

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {

    //store old position
    this.previousPosition.x = this.x;
    this.previousPosition.y = this.y;

  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value
  };
};
