# Rush Hour（高峰时刻）

## 作品概述

这是一个极简风格的物理仿真交互艺术作品，展现了"人"字形物体从漏斗顶部坠落，经过漏斗通道，最终落到带有空缺的地面上的场景。

## 技术实现

- **物理引擎**: Matter.js - 处理所有的物理仿真，包括刚体运动、碰撞检测和重力效果
- **SVG 路径转换**: 使用 Matter.js 的 `Svg.pathToVertices()` 将 SVG 路径转换为顶点数组，再通过 `Bodies.fromVertices()` 创建复杂的刚体形状（参考 [terrain.js 示例](https://github.com/liabru/matter-js/blob/master/examples/terrain.js)）
- **凹多边形处理**: 使用 `poly-decomp` 库自动将凹多边形分解为多个凸多边形，确保物理碰撞的准确性
- **SVGPathSeg Polyfill**: 使用 pathseg.js polyfill 解决现代浏览器中 SVGPathSeg API 被废弃的问题
- **渲染引擎**: p5.js - 通过 useP5 hook 实现极简风格的视觉呈现
- **视觉风格**: 白色背景，黑色线条，极简主义设计

## 主要特性

1. **漏斗地形**: 使用 SVG 路径通过 Matter.js 的 `Svg.pathToVertices` 和 `Bodies.fromVertices` 创建平滑的曲线刚体，呈现真实的漏斗形状
2. **动态地面系统**: 
   - 固定地面段：分布在活动板之间和两侧的静态地面
   - 活动板：定时同步向左滑动打开，形成间隙让球体落下
   - 两侧挡板：防止球体从侧面滚出
3. **传送带装置**: 位于地面下方的传送带系统
   - 两个滚轮：左右两端各有一个滚轮，带有旋转轮辐显示运动效果
   - 传送带轮廓：上下边缘线连接两个滚轮
   - 逆时针旋转：持续逆时针转动，象征着循环往复
4. **动态球体**: 持续从漏斗顶部生成，大小在一定范围内随机变化
5. **文字渲染**: 每个球体被渲染为"人"字，字体大小随球体半径动态调整，并随球体旋转而旋转，象征人群在时代洪流中的翻滚
6. **物理真实性**: 球体具有真实的物理属性（质量、摩擦力、弹性、旋转等）

## 艺术隐喻

作品通过物理仿真的方式，隐喻了现代生活中的"高峰时刻"：
- 漏斗象征着生活中的瓶颈和限制
- 坠落的"人"字象征着人群的流动和个体的无奈
- 分段的地面象征着社会结构的断裂和间隙
- 传送带象征着机械化的生活节奏和循环往复的命运
- 不断生成的新球体象征着永不停歇的时间流动

## 技术细节

### 凹多边形渲染

Matter.js 使用 `poly-decomp` 将凹多边形自动分解为多个凸多边形（parts）来处理物理碰撞。关键点：

1. **物理结构**：分解后的刚体是一个复合体，包含多个子刚体（`body.parts`）
2. **渲染优化**：
   - 物理碰撞使用分解后的多个凸多边形
   - 视觉渲染只绘制原始 SVG 路径的外轮廓
   - 这样既保证了物理准确性，又避免了显示内部分割线
3. **Debug 模式可视化**：启用 debug 模式可以看到分解后的各个凸多边形部分（用不同颜色填充）

### 传送带速度控制

传送带的速度通过 `CONVEYOR_BELT_SPEED` 参数统一控制：

1. **滚轮旋转速度**：根据公式 `角速度 = 线速度 / 半径` 自动计算
   - `CONVEYOR_WHEEL_ROTATION_SPEED = CONVEYOR_BELT_SPEED / CONVEYOR_WHEEL_RADIUS`
   
2. **对球体的作用力**：根据球体质量和传送带速度计算
   - `Force = ball.mass × CONVEYOR_BELT_SPEED × CONVEYOR_FORCE_MULTIPLIER`
   - 这确保了不同大小的球体都能获得合理的推力
   
3. **调节建议**：
   - 增大 `CONVEYOR_BELT_SPEED` 会同时加快滚轮旋转和传送速度
   - 调节 `CONVEYOR_FORCE_MULTIPLIER` 可以微调传送效果的强度

## 参数配置

可以通过修改代码中的常量来调整作品效果：

- `FUNNEL_PATHS`: SVG 路径数组，定义漏斗的形状
- `FUNNEL_WIDTH`: 漏斗参考宽度
- `FUNNEL_HEIGHT`: 漏斗参考高度
- `GROUND_WIDTH_RATIO`: 地面宽度占屏幕宽度的比例
- `TRAP_DOOR_COUNT`: 活动板数量
- `TRAP_DOOR_WIDTH_RATIO`: 活动板宽度比例
- `TRAP_DOOR_SLIDE_DISTANCE`: 活动板向左滑动的距离（像素）
- `TRAP_DOOR_OPEN_INTERVAL`: 活动板打开周期（毫秒）
- `TRAP_DOOR_OPEN_DURATION`: 活动板保持打开的时长（毫秒）
- `CONVEYOR_Y_OFFSET`: 传送带相对地面的Y轴偏移（像素）
- `CONVEYOR_WHEEL_RADIUS`: 传送带滚轮半径（像素）
- `CONVEYOR_BELT_SPEED`: 传送带表面速度（像素/帧），控制传送带向左移动的速度
- `CONVEYOR_FORCE_MULTIPLIER`: 传送带对球体施加的力系数，调节传送效果强度
- `BALL_MIN_RADIUS` / `BALL_MAX_RADIUS`: 球体半径范围
- `BALL_SPAWN_INTERVAL`: 球体生成间隔（毫秒）

## 特殊模式

### Debug 模式

在 URL 中添加 `?debug` 参数可以启用调试模式，例如：`/work/rush-hour?debug`

Debug 模式下会显示：
- **球体调试信息**：
  - 球体的边框（半透明蓝色圆圈）
  - 方向向量（从球体中心指向球体旋转方向的红色半径线，显示球体的姿态）
  - 角度数值（显示球体的旋转角度，单位：度）
  - 角速度数值（显示球体的旋转速度）
- **漏斗分解可视化**：
  - 用不同颜色填充显示漏斗被分解成的各个凸多边形部分
  - 帮助理解 poly-decomp 如何将凹多边形分解为多个凸多边形
- **活动板标记**：
  - 红色圆点标记活动板的初始位置

这对于理解物理仿真中球体的旋转状态、凹多边形分解过程以及活动板的运动轨迹非常有用。

### Emoji 模式

在 URL 中添加 `?emoji` 参数可以启用 Emoji 模式，例如：`/work/rush-hour?emoji`

Emoji 模式下：
- 球体会显示为随机的 emoji 表情，而不是"人"字
- 每个球体生成时会从预设的 12 个表情中随机选择一个
- 表情会随着球体一起旋转和翻滚
- 可以同时启用多个模式，如：`/work/rush-hour?debug&emoji`

