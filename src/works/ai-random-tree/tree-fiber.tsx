import { useMemo, useRef, useEffect, useState } from 'react'
import { folder, useControls } from 'leva'
import * as THREE from 'three'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber' // NOTICE: v9版本大概率不兼容react18！
import { OrbitControls } from '@react-three/drei'
import './index.scss'
import type { TreeNode } from './tree.worker'
import TreeWorker from './tree.worker.ts?worker'
// 导入着色器文件
import branchVertexShader from './shaders/branch.vert?raw'
import branchFragmentShader from './shaders/branch.frag?raw'
import leafVertexShader from './shaders/leaf.vert?raw'
import leafFragmentShader from './shaders/leaf.frag?raw'
import watercolorPostVert from './shaders/watercolor-post.vert?raw'
import watercolorPostFrag from './shaders/watercolor-post.frag?raw'
import { useMultiLangText } from '@/hooks/text'

// 创建共享材质
// 创建共享光照参数
const lightParams = {
  ambientLightIntensity: 0.5,
  directionalLightPosition: new THREE.Vector3(-50, -200, 100),
  directionalLightIntensity: 1
}

// 创建共享材质
const watercolorMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#B4845F') },
    ambientLightIntensity: { value: lightParams.ambientLightIntensity },
    directionalLightPosition: { value: lightParams.directionalLightPosition },
    directionalLightIntensity: { value: lightParams.directionalLightIntensity }
  },
  vertexShader: branchVertexShader,
  fragmentShader: branchFragmentShader,
  side: THREE.DoubleSide,
  // transparent: true
})

const leafMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    season: { value: 0.0 },
    ambientLightIntensity: { value: lightParams.ambientLightIntensity },
    directionalLightPosition: { value: lightParams.directionalLightPosition },
    directionalLightIntensity: { value: lightParams.directionalLightIntensity }
  },
  vertexShader: leafVertexShader,
  fragmentShader: leafFragmentShader,
  side: THREE.DoubleSide
})

// 创建共享几何体 - 扁平的椭圆形叶片
const leafGeometry = new THREE.CircleGeometry(1.5, 8)

// 动画并发控制
const MAX_CONCURRENT_ANIMATIONS = 10
let currentAnimationCount = 0

// Branch组件 - 负责渲染单个分支及其叶片
function Branch({ node, season }: { node: TreeNode, season: number }) {
  const { clock } = useThree()
  const [visible, setVisible] = useState(false)
  const [scale, setScale] = useState(0)
  const level = useRef(0)

  useEffect(() => {
    // 计算当前分支的层级
    level.current = node.level

    // 根据层级设置延迟时间
    const delay = level.current * 200 // 每层延迟500ms
    setTimeout(() => {
      setVisible(true)
      // 添加缩放动画
      const startTime = Date.now()
      currentAnimationCount++ // 增加动画计数
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 1000, 1) // 500ms内完成缩放
        setScale(progress)
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          currentAnimationCount-- // 动画结束时减少计数
        }
      }
      requestAnimationFrame(animate)
    }, delay)
  }, [])

  // 每帧更新材质动画和季节参数
  useFrame(() => {
    watercolorMaterial.uniforms.time.value = clock.getElapsedTime()
    leafMaterial.uniforms.time.value = clock.getElapsedTime()
    leafMaterial.uniforms.season.value = season
  })

  // 将普通对象转换为THREE.js对象
  const position = new THREE.Vector3(node.position.x, node.position.y, node.position.z)
  const rotation = new THREE.Euler(node.rotation.x, node.rotation.y, node.rotation.z, node.rotation.order as THREE.EulerOrder)

  // 使用三次贝塞尔曲线生成平滑的分支形状，调整控制点使连接更平滑
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    // 调整第一个控制点，使其更靠近起点
    new THREE.Vector3(node.controlX * 0.1 * Math.cos(rotation.z), node.length * 0.15, node.controlX * 0.1 * Math.sin(rotation.z)),
    // 调整第二个控制点，使其更靠近终点
    new THREE.Vector3(node.controlX * 0.9 * Math.cos(rotation.z), node.length * 0.85, node.controlX * 0.9 * Math.sin(rotation.z)),
    new THREE.Vector3(0, node.length, 0)
  )

  // 性能优化：增加曲线细分数量以提高平滑度
  const points = curve.getPoints(32) // 增加采样点数量以提高平滑度

  // 根据层级计算过渡因子
  const transitionFactor = Math.pow(0.85, level.current)
  const adjustedThickness = (node.thickness / 2) * transitionFactor

  const geometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    24, // 增加管道段数
    adjustedThickness,
    12, // 管道横截面分段数
    false
  )

  if (!visible) return null

  return (
    <group>
      <group position={position} rotation={rotation} scale={scale}>
        <mesh geometry={geometry} material={watercolorMaterial} />

        {node.leafSizes.length > 0 && (
          <group position={[0, node.length, 0]}>
            {node.leafOffsets.map((offset, i) => (
              <mesh
                key={i}
                position={[
                  // 调整叶片位置，使其更贴近树枝表面
                  offset.x * Math.cos(rotation.z) - offset.y * Math.sin(rotation.z) * 0.3,
                  offset.x * Math.sin(rotation.z) + offset.y * Math.cos(rotation.z) * 0.3,
                  // 添加z轴偏移，使叶片更贴合树枝表面
                  node.thickness * 0.4 * (Math.random() > 0.5 ? 1 : -1)
                ]}
                // 调整叶片的旋转角度，使其更自然地从树枝生长出来
                rotation={[
                  // 减小x轴旋转角度，使叶片更平行于树枝
                  Math.PI / 6 + Math.random() * 0.2,
                  // 使叶片围绕树枝生长
                  Math.random() * Math.PI * 2,
                  // 使叶片的旋转更接近树枝的方向
                  rotation.z + (Math.random() - 0.5) * 0.3
                ]}
                material={leafMaterial}
                // 调整叶片的比例，使其更细长且贴合树枝
                scale={[node.leafSizes[i] / 6, node.leafSizes[i] / 2, node.leafSizes[i] / 10]}
              >
                <primitive object={leafGeometry} />
              </mesh>
            ))}
          </group>
        )}

        {node.branches.map((branch, i) => (
          <Branch key={i} node={branch} season={season} />
        ))}
      </group>
    </group>
  )
}

function MainSceneContents({ treeStructure, season }: { treeStructure: TreeNode | null, season: number }) {
  return (
    <>
      <ambientLight intensity={1.0} />
      <pointLight position={[100, 100, 100]} intensity={1.5} />
      <directionalLight position={[-50, -200, 100]} intensity={0.8} />
      {/* 为Branch组件添加一个基于时间戳的key，确保每次生成新的树结构时都能触发绽放动画。 */}
      {treeStructure && <Branch key={Date.now()} node={treeStructure} season={season} />}
    </>
  )
}

function WatercolorPost({
  inputScene,
  controls
}: {
  inputScene: THREE.Scene
  controls: {
    paperScale: number
    paperStrength: number
    granulation: number
    edgeDarken: number
    bleed: number
    wash: number
    warp: number
    bloom: number
    vignette: number
  }
}) {
  const { gl, camera, scene, size, clock } = useThree()
  const quadRef = useRef<THREE.Mesh | null>(null)

  const renderTarget = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false
    })
    rt.texture.name = 'ai-random-tree-watercolor-input'
    return rt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const postMaterial = useMemo(() => {
    return new THREE.RawShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
        time: { value: 0 },
        paperScale: { value: controls.paperScale },
        paperStrength: { value: controls.paperStrength },
        granulation: { value: controls.granulation },
        edgeDarken: { value: controls.edgeDarken },
        bleed: { value: controls.bleed },
        wash: { value: controls.wash },
        warp: { value: controls.warp },
        bloom: { value: controls.bloom },
        vignette: { value: controls.vignette }
      },
      vertexShader: watercolorPostVert,
      fragmentShader: watercolorPostFrag,
      depthTest: false,
      depthWrite: false
    })
  }, [])

  // Keep RT and uniforms in sync with canvas size and UI controls
  useEffect(() => {
    renderTarget.setSize(size.width, size.height)
    postMaterial.uniforms.resolution.value.set(size.width, size.height)
  }, [renderTarget, postMaterial, size.width, size.height])

  useFrame(() => {
    // Render the main scene into RT
    gl.setClearColor(new THREE.Color('#F5F5F0'), 1.0)
    gl.setRenderTarget(renderTarget)
    gl.clear(true, true, true)
    gl.render(inputScene, camera)
    gl.setRenderTarget(null)

    // Update post uniforms
    postMaterial.uniforms.tDiffuse.value = renderTarget.texture
    postMaterial.uniforms.time.value = clock.getElapsedTime()
    postMaterial.uniforms.paperScale.value = controls.paperScale
    postMaterial.uniforms.paperStrength.value = controls.paperStrength
    postMaterial.uniforms.granulation.value = controls.granulation
    postMaterial.uniforms.edgeDarken.value = controls.edgeDarken
    postMaterial.uniforms.bleed.value = controls.bleed
    postMaterial.uniforms.wash.value = controls.wash
    postMaterial.uniforms.warp.value = controls.warp
    postMaterial.uniforms.bloom.value = controls.bloom
    postMaterial.uniforms.vignette.value = controls.vignette

    // Ensure the quad uses latest material (ref safety)
    if (quadRef.current) {
      quadRef.current.material = postMaterial
    }

    // IMPORTANT:
    // When using a render priority (>0), R3F will stop auto-rendering.
    // So we must render the root scene manually, otherwise the screen is blank.
    gl.clear(true, true, true)
    gl.render(scene, camera)
  }, 1)

  return (
    <mesh ref={quadRef} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[2, 2]} />
      <primitive object={postMaterial} attach="material" />
    </mesh>
  )
}

// TreeFiber组件 - 主渲染组件
function TreeFiber() {
  // 使用leva库创建可调节的参数控制面板
  const controls = useControls({
    // 树木参数
    density: { value: 0.7, min: 0.3, max: 1, step: 0.1 }, // 分支密度
    lengthFactor: { value: 0.8, min: 0.5, max: 0.9, step: 0.1 }, // 长度衰减
    thicknessFactor: { value: 0.7, min: 0.5, max: 0.9, step: 0.1 }, // 粗细衰减
    maxLevel: { value: 6, min: 3, max: 10, step: 1 }, // 最大层级
    maxLeafCount: { value: 360, min: 10, max: 600, step: 10 }, // 最大叶片数
    season: { value: 0.3, min: 0, max: 1, step: 0.01 }, // 季节变化
    水彩后处理: folder({
      paperScale: { value: 7.8, min: 2, max: 16, step: 0.1 },
      paperStrength: { value: 0.9, min: 0, max: 1, step: 0.01 },
      granulation: { value: 0.75, min: 0, max: 1, step: 0.01 },
      edgeDarken: { value: 0.9, min: 0, max: 1, step: 0.01 },
      bleed: { value: 0.85, min: 0, max: 1, step: 0.01 },
      wash: { value: 0.65, min: 0, max: 1, step: 0.01 },
      warp: { value: 0.65, min: 0, max: 1, step: 0.01 },
      bloom: { value: 0.55, min: 0, max: 1, step: 0.01 },
      vignette: { value: 0.25, min: 0, max: 1, step: 0.01 }
    }),
    // 相机操作说明
    相机操作: folder({
      操作说明: {
        value: useMultiLangText({
          zh: '鼠标左键: 旋转视角\n鼠标右键: 平移场景\n鼠标滚轮: 缩放场景',
          en: 'Left Mouse: Rotate View\nRight Mouse: Pan Scene\nMouse Wheel: Zoom Scene'
        }),
        editable: false
      }
    }),
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const treeStructure = useRef<TreeNode | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const mainScene = useMemo(() => new THREE.Scene(), [])
  const wc = ((controls as any)['水彩后处理'] ?? controls) as any

  useEffect(() => {
    // 创建Worker实例
    workerRef.current = new TreeWorker()

    // 设置Worker消息处理
    workerRef.current.onmessage = (e: MessageEvent<{ type: string, data?: TreeNode, error?: string }>) => {
      setIsLoading(false)
      if (e.data.type === 'success' && e.data.data) {
        treeStructure.current = e.data.data
        setError(null)
      } else if (e.data.type === 'error') {
        setError(e.data.error || '生成树结构时发生错误')
      }
    }

    // 设置Worker错误处理
    workerRef.current.onerror = () => {
      setIsLoading(false)
      setError('Worker执行过程中发生错误')
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  useEffect(() => {
    const generateTreeWithDebounce = () => {
      if (debounceTimerRef.current) {
        window.cancelAnimationFrame(debounceTimerRef.current)
      }

      debounceTimerRef.current = window.requestAnimationFrame(() => {
        if (workerRef.current) {
          setIsLoading(true)
          setError(null)
          workerRef.current.postMessage({
            len: 180,
            thickness: 20,
            density: controls.density,
            lengthFactor: controls.lengthFactor,
            thicknessFactor: controls.thicknessFactor,
            maxLevel: controls.maxLevel,
            maxLeafCount: controls.maxLeafCount
          })
        }
      })
    }

    generateTreeWithDebounce()

    return () => {
      if (debounceTimerRef.current) {
        window.cancelAnimationFrame(debounceTimerRef.current)
      }
    }
  }, [controls.density, controls.lengthFactor, controls.thicknessFactor, controls.maxLevel, controls.maxLeafCount])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#F5F5F0', position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
          }}
        >
          正在生成树结构...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ff6b6b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            zIndex: 1000
          }}
        >
          {error}
        </div>
      )}
      <Canvas
        camera={{
          position: [-300, -200, 100],
          fov: 75,
          far: 2000,
        }}
        style={{ background: '#F5F5F0' }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: false, // 关闭抗锯齿以提高性能
          powerPreference: 'high-performance' // 优先使用高性能GPU
        }}
        dpr={[1, 2]} // 适配不同设备像素比
        performance={{ min: 0.5 }} // 允许在性能不足时降低渲染质量
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={100}
          maxDistance={1000}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          target={new THREE.Vector3(0, 300, 0)}
        />

        {/* 把“真实场景内容”渲染到离屏 mainScene */}
        {createPortal(
          <MainSceneContents treeStructure={treeStructure.current} season={controls.season} />,
          mainScene
        )}

        {/* 在屏幕上用后处理 shader 显示 mainScene */}
        <WatercolorPost
          inputScene={mainScene}
          controls={{
            paperScale: wc.paperScale ?? 7.0,
            paperStrength: wc.paperStrength ?? 0.7,
            granulation: wc.granulation ?? 0.55,
            edgeDarken: wc.edgeDarken ?? 0.65,
            bleed: wc.bleed ?? 0.55,
            wash: wc.wash ?? 0.35,
            warp: wc.warp ?? 0.65,
            bloom: wc.bloom ?? 0.55,
            vignette: wc.vignette ?? 0.35
          }}
        />
      </Canvas>
    </div>
  )
}

export default TreeFiber
