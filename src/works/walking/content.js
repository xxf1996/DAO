let stepContainer = document.getElementById('step')
let isUp = true
let prev = Date.now()
let stepNum = 2
const frameTime = 1000
const maxStep = 30

function addStep() {
  let cur = Date.now()
  if (cur - prev > frameTime) {
    let step = document.createElement('span')
    step.classList.add('step-item')
    step.classList.add(isUp ? 'step-up' : 'step-down')
    isUp = !isUp
    prev = cur

    if (stepNum >= maxStep) {
      stepNum = 0
      stepContainer.innerHTML = ''
    }

    stepContainer.prepend(step)
    stepNum++
  }

  // console.log(cur, prev, cur - prev, isUp)

  requestAnimationFrame(addStep)
}

addStep()
