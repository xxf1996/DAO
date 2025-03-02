import { useRef, useEffect, useState } from 'react'
import { useControls } from 'leva'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber' // NOTICE: v9版本大概率不兼容react18！
import { OrbitControls } from '@react-three/drei'
import './index.scss'
import type { TreeNode } from './tree.worker'
import TreeWorker from './tree.worker.ts?worker'

// 创建共享材质
const watercolorMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 }, // 用于动画效果
    color: { value: new THREE.Color('#8B4513') }, // 树干基础颜色
    opacity: { value: 0.8 } // 透明度
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec2 st = vUv;
      float noise = random(st + time * 0.1);
      vec3 finalColor = mix(color, color * 1.2, noise);
      gl_FragColor = vec4(finalColor, opacity * (0.8 + noise * 0.2));
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
})

const leafMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 }, // 用于动画效果
    season: { value: 0.0 }, // 季节变化参数 (0-1)
    opacity: { value: 0.6 } // 基础透明度
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform float time;
    uniform float season;
    uniform float opacity;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    vec3 getSeasonColor(float season) {
      vec3 springColor = vec3(0.7, 1.0, 0.5);  // 更鲜亮的春季绿色
      vec3 summerColor = vec3(0.0, 0.8, 0.0);  // 更饱和的夏季绿色
      vec3 autumnColor = vec3(1.0, 0.6, 0.1);  // 更鲜艳的秋季金黄色
      vec3 winterColor = vec3(0.7, 0.3, 0.1);  // 更温暖的冬季褐色

      float normalizedSeason = season * 3.0;
      int seasonIndex = int(floor(normalizedSeason));
      float t = fract(normalizedSeason);

      if (seasonIndex == 0) return mix(springColor, summerColor, t);
      if (seasonIndex == 1) return mix(summerColor, autumnColor, t);
      if (season == 1.0f) return winterColor;
      return mix(autumnColor, winterColor, t);
    }

    void main() {
      vec2 st = vUv;
      float noise = random(st + time * 0.1);
      vec3 seasonColor = getSeasonColor(season);
      vec3 finalColor = mix(seasonColor, seasonColor * 1.2, noise);
      float seasonOpacity = opacity * (1.0 - season * 0.3); // 冬天时叶片更透明
      gl_FragColor = vec4(finalColor, seasonOpacity * (0.8 + noise * 0.2));
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
})

// 创建共享几何体 - 扁平的椭圆形叶片
const leafGeometry = new THREE.CircleGeometry(1.5, 8)

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
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 1000, 1) // 500ms内完成缩放
        setScale(progress)
        if (progress < 1) {
          requestAnimationFrame(animate)
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

  // 使用三次贝塞尔曲线生成平滑的分支形状
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(node.controlX * Math.cos(rotation.z), node.length * 0.3, node.controlX * Math.sin(rotation.z)),
    new THREE.Vector3(node.controlX * Math.cos(rotation.z), node.length * 0.7, node.controlX * Math.sin(rotation.z)),
    new THREE.Vector3(0, node.length, 0)
  )

  // 性能优化：减少几何体的细分数量
  const points = curve.getPoints(8)
  const geometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    6,
    node.thickness / 2,
    6,
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

// TreeFiber组件 - 主渲染组件
function TreeFiber() {
  // 使用leva库创建可调节的参数控制面板
  const controls = useControls({
    density: { value: 0.7, min: 0.3, max: 1, step: 0.1 }, // 分支密度
    lengthFactor: { value: 0.8, min: 0.5, max: 0.9, step: 0.1 }, // 长度衰减
    thicknessFactor: { value: 0.7, min: 0.5, max: 0.9, step: 0.1 }, // 粗细衰减
    maxLevel: { value: 6, min: 3, max: 10, step: 1 }, // 最大层级
    maxLeafCount: { value: 240, min: 10, max: 500, step: 10 }, // 最大叶片数
    season: { value: 0.3, min: 0, max: 1, step: 0.01 } // 季节变化
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const treeStructure = useRef<TreeNode | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const debounceTimerRef = useRef<number | null>(null)

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
        camera={{ position: [0, -800, 500], fov: 75, far: 2000 }}
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
        />
        <ambientLight intensity={1.0} />
        <pointLight position={[100, 100, 100]} intensity={1.5} />
        <directionalLight position={[-50, -200, 100]} intensity={0.8} />
        {/* 为Branch组件添加一个基于时间戳的key，确保每次生成新的树结构时都能触发绽放动画。 */}
        {treeStructure.current && <Branch key={Date.now()} node={treeStructure.current} season={controls.season} /> }
      </Canvas>
    </div>
  )
}

export default TreeFiber
