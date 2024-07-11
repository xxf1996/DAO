var winWidth = window.innerWidth
var winHeight = window.innerHeight
var deg = Math.PI / 180

var moveMultiple = 1.0
var blocks = []
var colorList = [120, 160, 180, 200, 240]
var bgColor
var moveDirection
var f1

function setup() {
  createCanvas(winWidth, winHeight)
  bgColor = color(135, 228, 240)
  moveDirection = createVector(-1, 0)
  f1 = new Fans(10, 40)
  background(bgColor)
  initBlocks(128)
  rectMode(CENTER)
}

function draw() {
  background(bgColor)
  drawBlocks()
  // Fish();
  f1.display()
}

function mouseMoved() {
  moveDirection = createVector(winWidth / 2 - mouseX, winHeight / 2 - mouseY).normalize()
  moveMultiple = 0.8 + Math.abs(mouseX - winWidth / 2) / winWidth * 4
}

function Block() {
  var _this = this
  _this.pos = 0
  _this.size = 0
  _this.angle = 0
  _this.rotateSpeed = 0
  _this.speed = 0
  _this.color = []

  _this.display = function () {
    translate(_this.pos.x, _this.pos.y)
    rotate(_this.angle * deg)
    fill(_this.color)
    rect(0, 0, _this.size, _this.size)
    rotate(-_this.angle * deg)
    var a_pos = p5.Vector.mult(_this.pos, -1)
    translate(a_pos.x, a_pos.y)
    _this.action()
  }

  _this.init = function () {
    _this.angle = random(0, 90)
    _this.size = random(10, 30)
    _this.rotateSpeed = random(10, 30) / 10
    _this.speed = random(1, 5)
    _this.color = color(random(colorList), random(colorList), random(colorList))
    if (moveDirection.x < 0) {
      _this.pos = createVector(random(winWidth - 40, winWidth - 20), random(20, winHeight - 20))
    } else {
      _this.pos = createVector(random(20, 40), random(20, winHeight - 20))
    }
  }

  _this.action = function () {
    var posMultiply = _this.pos.x * _this.pos.y
    if (posMultiply < 0 || _this.pos.y > winHeight || _this.pos.x > winWidth) {
      _this.init()
    } else {
      _this.angle = (_this.angle + _this.rotateSpeed * moveMultiple) % 360
      // _this.pos.x += moveForward * moveMultiple * _this.speed;
      _this.pos.add(p5.Vector.mult(moveDirection, moveMultiple * _this.speed))
    }
  }

  _this.init()
}

function Fans(width, height) {
  var _this = this
  _this.w = width
  _this.h = height
  _this.angle = random(90)

  _this.display = function () {
    stroke(60)
    translate(mouseX, mouseY)
    rotate(_this.angle * deg)

    fill(30)
    rect(0, 0, _this.w, _this.w)
    fill(120, 200, 160)
    rect(0, (_this.w + _this.h) / 2, _this.w, _this.h)
    fill(200, 120, 160)
    rect(0, -(_this.w + _this.h) / 2, _this.w, _this.h)
    fill(160, 200, 120)
    rect((_this.w + _this.h) / 2, 0, _this.h, _this.w)
    fill(120, 160, 200)
    rect(-(_this.w + _this.h) / 2, 0, _this.h, _this.w)

    rotate(-_this.angle * deg)
    translate(-mouseX, -mouseY)
    _this.action()
    stroke(0)
  }

  _this.action = function () {
    _this.angle = (_this.angle + 6 * moveMultiple) % 360
  }
}

function initBlocks(n) {
  blocks = []
  for (var i = 0; i < n; i++) {
    blocks.push(new Block())
  }
}

function drawBlocks() {
  for (var i in blocks) {
    blocks[i].display()
  }
  // ellipse(mouseX, mouseY, 20, 20);
}
