import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'

let bg: Background

class Background {
  private readonly initialWidth = 400
  private windowWidth: number
  private windowHeight: number
  private left: number
  private right: number
  /** tween animation group */
  private animations = new Group()
  constructor(private p5: P5CanvasInstance) {
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight
    this.left = (this.windowWidth - this.initialWidth) / 2
    this.right = (this.windowWidth + this.initialWidth) / 2
  }

  private get y() {
    return -this.windowHeight / 2
  }

  private get x() {
    return this.left - this.windowWidth / 2
  }

  private get width() {
    if (this.right > this.left) {
      return this.right - this.left
    }

    return 0
  }

  private animation() {
    this.animations.update(performance.now())
  }

  display() {
    this.animation()
    this.p5.fill(10)
    this.p5.rect(this.x, this.y, this.width, this.windowHeight)
  }

  setLeft(left: number) {
    this.left = left
  }

  setRight(right: number) {
    this.right = right
  }

  deltaLeft(delta: number) {
    this.setLeft(this.left + delta)
  }

  deltaRight(delta: number) {
    this.setRight(this.right + delta)
  }

  transition(left: number, right: number) {
    const tween = new Tween({ left: this.left, right: this.right })
      .to({ left, right }, 2000)
      .delay(1000)
      .easing(Easing.Quadratic.Out)
      .onUpdate(({ left, right }) => {
        this.setLeft(left)
        this.setRight(right)
      })
      .onComplete(() => {
        console.log('remove animation')
        this.animations.remove(tween)
      })
      .start()

    this.animations.add(tween)

    return tween
  }

  transitionToWidth(width: number) {
    return this.transition(
      (this.windowWidth - width) / 2,
      (this.windowWidth + width) / 2
    )
  }
}

function setup(p5: P5CanvasInstance) {
  bg = new Background(p5)
  p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL)
  bg.transitionToWidth(600)
}

function draw(p5: P5CanvasInstance) {
  p5.background(240)
  // bg.deltaLeft(-0.1)
  // bg.deltaRight(0.02)
  bg.display()
}

function ThoughtsWandering() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default ThoughtsWandering
