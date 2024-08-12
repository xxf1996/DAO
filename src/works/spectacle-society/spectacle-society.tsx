import { useP5 } from '@/hooks/p5'
import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import type { Color, Vector } from 'p5'

const spectacles: Spectacles[] = []

class Spectacles {
  static spectaclesSize = 20
  private depth = 0
  private color: Color
  constructor(private p5: P5CanvasInstance, private position: Vector) {
    this.color = p5.color(240)
  }

  setZ(z: number) {
    this.depth = z
  }

  setColor(color: Color) {
    this.color = color
  }

  display() {
    this.p5.push()
    this.p5.fill(20)
    this.p5.stroke(this.color)
    this.p5.strokeWeight(3)
    this.p5.strokeCap(this.p5.SQUARE)
    this.p5.translate(this.position.x, this.position.y, this.depth)
    // this.p5.rotateY(this.p5.frameCount * 0.01)
    const left = -Spectacles.spectaclesSize * 1.5
    const right = Spectacles.spectaclesSize * 1.5
    const top = -Spectacles.spectaclesSize * 0.5
    this.p5.rect(left, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    this.p5.rect(Spectacles.spectaclesSize * 0.5, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    this.p5.line(-Spectacles.spectaclesSize * 0.5, 0, Spectacles.spectaclesSize * 0.5, 0)
    this.p5.strokeWeight(1)
    this.p5.noFill()
    this.p5.beginShape()
    this.p5.vertex(left, 0, 0)
    this.p5.vertex(left, 0, -Spectacles.spectaclesSize * 2)
    this.p5.vertex(left, 5, -Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    this.p5.beginShape()
    this.p5.vertex(right, 0, 0)
    this.p5.vertex(right, 0, -Spectacles.spectaclesSize * 2)
    this.p5.vertex(right, 5, -Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    this.p5.pop()
  }
}

/** 按照封面图的原始视角进行相应的还原 */
function originalViewSetup(p5: P5CanvasInstance) {
  p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL)
  for (let x = -20; x <= 20; x++) {
    for (let y = -10; y <= 10; y++) {
      const el = new Spectacles(p5, p5.createVector(x * 100, y * 100))
      el.setZ(y * 100)
      if (x === 0 && y === 0) {
        el.setColor(p5.color(255, 0, 0))
      }
      spectacles.push(el)
    }
  }
  const camera = p5.createCamera()
  const basis = 1
  camera.setPosition(2000 * basis, 500 * basis, 1500 * basis)
  camera.lookAt(-2000 * basis, 0 * basis, -2500 * basis)
  p5.setCamera(camera)
  p5.debugMode(p5.AXES)
}

function originalViewDraw(p5: P5CanvasInstance) {
  p5.background(20)
  // 由于相机无法设置旋转？根据原图，顶部应该是水平的，所以对整体结果进行旋转以便对齐
  p5.rotateZ(0.33)
  spectacles.forEach(s => s.display())
}

function SpectacleSociety() {
  const { sketch } = useP5(originalViewSetup, originalViewDraw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SpectacleSociety
