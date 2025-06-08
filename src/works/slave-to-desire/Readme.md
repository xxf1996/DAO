![image.png](http://pic.xiexuefeng.cc/markdown/202506081239489.png?imageView2/2/w/400)

- 作品地址：https://dao.xiexuefeng.cc/slave-to-desire
- 作品源码：https://github.com/xxf1996/DAO/tree/main/src/works/slave-to-desire

# 关于作品

欲望的奴隶，其实指的就是我自己🙈。

某天路上脑海里想起一个画面：一个人在不停地吹泡泡，这些泡泡慢慢变大，大到可以把 ta 包围住，然后一起漂浮至空中直到破裂，如此往复。

所以，这个泡泡就是一个美丽的囚牢，而我们却又乐此不疲地吹出这个囚牢把自己一次次禁锢在里面，心甘情愿地成为它们的奴隶。

说到底，这个作品也只是其中的一个泡泡，现在它破了，但我大概还是会接着吹出更多的泡泡吧……

# 制作过程

我现在已经习惯当甲方了，动动嘴皮子就行，AI Agent 是我值得信赖的合作伙伴，所以下面看看聊天记录就行🙃，代码没啥好说的，AI 写得挺不错的，不过这次功能稍微复杂一点，导致代码写得有点长（上千行），而且其实用了很多动画制作的逻辑，应该用一个专门制作 2d 动画的渲染引擎框架可能会更高效一点。

![局部截取_20250512_172137.png](http://pic.xiexuefeng.cc/markdown/202505121721130.png?imageslim)

## 坠落

我在网上找了一些用简约线条描绘人下坠的姿态图片，让 AI 进行参考复刻：

![image.png](http://pic.xiexuefeng.cc/markdown/202505301644219.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505301659410.png?imageView2/2/w/300)

![局部截取_20250530_172404.png](http://pic.xiexuefeng.cc/markdown/202505301724080.png?imageslim)

![局部截取_20250530_172441.png](http://pic.xiexuefeng.cc/markdown/202505301724594.png?imageslim)

不过 AI 好像很难直接从这种抽象的图片中识别出准确的姿态信息，哪怕是结合一定的文字描述它仍然无法绘制出我想要的那种坠落姿态：

![局部截取_20250530_171152.png](http://pic.xiexuefeng.cc/markdown/202505301712763.png?imageslim)

所以就得到了上面的效果，貌似符合 V 型姿态的需求，但实际上完全没有把身体转过来😂，不过好在经过我的提示，AI 终于知道姿态调整的顺序错了：

![局部截取_20250530_172548.png](http://pic.xiexuefeng.cc/markdown/202505301726495.png?imageslim)

![局部截取_20250530_172729.png](http://pic.xiexuefeng.cc/markdown/202505301727383.png?imageslim)

## 速度线

为了让坠落的过程更符合直觉，有一种下坠的速度感，我让 AI 参考漫画中常用的速度线技巧在坠落时增加一组速度线：

![image.png](http://pic.xiexuefeng.cc/markdown/202505311602327.png?imageslim)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311637347.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311743811.png?imageView2/2/w/400)

## 水彩泡泡

![image.png](http://pic.xiexuefeng.cc/markdown/202505311223077.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311241764.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311241488.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311237361.png?imageView2/2/w/400)

在让 AI 还原了水彩风格的渐变色泡泡后，我还想让 AI 还原水彩的纸张纹理，然而效果不佳，不过仔细想想，这种纹理至少要用着色器或者直接贴一张图片纹理更合适一点，对于 AI 来说有点为难了😂。
![image.png](http://pic.xiexuefeng.cc/markdown/202505311521459.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311521471.png?imageView2/2/w/400)

从 AI 的实现来说，它的纹理实现思路就是几个圆形渐变色块的叠加，看起来很粗糙，也有点脏。

## 猫嘴

总觉得在漂浮过程中，要是没点表情就略显枯燥，所以加上了一个猫嘴的表情——略带滑稽又有一点惬意。此处放上泉此方的表情包（能懂这个的都是老二次元了🙈）：

![image.png](http://pic.xiexuefeng.cc/markdown/202505311700511.png?imageslim)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311747912.png?imageView2/2/w/400)

![image.png](http://pic.xiexuefeng.cc/markdown/202505311741557.png?imageView2/2/w/400)

# 后话

其实还有更多的与 AI 沟通的细节之处可以讲一讲的，当甲方也不是那么容易的😂。但是全是聊天记录太冗长了，而且也懒得整理了🙃
