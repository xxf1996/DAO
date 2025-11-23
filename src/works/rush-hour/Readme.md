![image.png](http://pic.xiexuefeng.cc/markdown/202511231842796.png?imageslim)

- 作品地址：https://dao.xiexuefeng.cc/rush-hour
- 作品源码：https://github.com/xxf1996/DAO/tree/main/src/works/rush-hour

这个作品虽说有点抽象，但是只要体验过地铁早高峰（晚高峰也算吧），一眼就能看出整个过程实则就是纪录片了🤣。

也就是最近遇到早高峰的频率有点高了，观察了整个过程，脑子里就冒出了沙粒堆积随后落入各个入口的初始场景，最终分布大致跟正态分布差不多……

不过沙粒的模拟还是有点太难了，粒子系统的优化很费时间。所以最后就想到了用简化的“人”字来代替沙粒，效果也差不多。

整个物理仿真效果使用了matter.js进行模拟，效果还是挺符合预期的。

最后，还特地试了下用emoji随机化来代表早高峰中人的表情（实际观察早高峰人们的表情并没有这么丰富🙈）：

![image.png](http://pic.xiexuefeng.cc/markdown/202511231853272.png?imageslim)

emoji版：https://dao.xiexuefeng.cc/rush-hour?emoji

纯整活，整个作品的代码我依然没有写过几行，AI还是太好用了。
