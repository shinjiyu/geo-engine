# geo-engine

Cube-sphere 地图引擎：**纯规则生成 + 空间事实查询**，不使用 LLM。

为编年史引擎（chronicle-engine）提供 `SpatialFactPack`：势力距离、分隔山脉/河流、事件锚点周边地形与人口等。

## 架构

| 模块 | 职责 |
|------|------|
| `src/topology/cube-sphere.js` | 6 面矩形网格、邻居表、Haversine 距离 |
| `vendor/world-orogen/` | GPL-3.0 World Orogen 板块与造山算法源码 |
| `src/generate/` | Orogen 适配、气候、水文、势力、山脉 |
| `src/facts/spatial-fact-pack.js` | 查询与 LLM 文本格式化 |
| `src/facts/chronicle-contract.js` | Geo–Chronicle v1 空间引用、事件锚点与校验 |
| `src/world-builder.js` | 创建/持久化世界 |

默认 L0 粒度：`128×128×6` 面（约 98k 格，~72 km/格）。开发/测试可用 `32` 加速。

## 快速开始

```bash
cd experiments/geo-engine
npm test          # smoke test (n=32)
npm run cli -- create demo 32
npm start         # http://localhost:3003
```

浏览器打开 **http://localhost:3003/** 即可使用地图预览：

- **世界地图**（Web 墨卡托，与 Google 地图同类投影）— 默认视图
- **3D 地球** — 拖拽旋转，贴墨卡托纹理
- **等距圆柱** / **立方体 6 面** — 科研/调试视图
- 地理图层：地形 / 海拔 / 魔法浓度（河流内置叠加）
- 单击地球放置红色定位点，再生成北向上的方位等距制图图幅（等高线、晕渲、比例尺、指北针）
- 鼠标悬停查询格子详情（海拔、势力、人口）
- 侧边栏一键生成世界（可设 seed、N/面、种族）

打开 **`http://localhost:3003/?world={worldId}`** 可直接预览一个已持久化世界。该模式从栅格 API
读取对应世界，不会按默认 seed 重新生成另一张地图；可切换地形、势力、海拔与魔法图层。

## 地图 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/worlds/:id/map/mercator?layer=&width=&height=` | Web 墨卡托 RGBA（日常世界地图） |
| GET | `/worlds/:id/map/equirect?layer=&width=&height=` | 等距圆柱 RGBA |
| GET | `/worlds/:id/map/face/:face?layer=&scale=` | 单面 RGBA 栅格 |
| GET | `/worlds/:id/map/region?centerLat=&centerLon=&span=&layer=&width=&height=` | 局部二维平面地图 |
| GET | `/worlds/:id/map/pick?lat=&lon=` | 经纬度拾取格子 |
| GET | `/worlds/:id/map/pick-face?face=&u=&v=` | 立方体面 UV 拾取 |

`layer`：`terrain` · `realms` · `elevation` · `magic`

## HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/worlds` | 列出已保存世界 |
| POST | `/worlds` | 创建世界 `{ seed, grid: { cellsPerFaceEdge }, seedWorld: { magic, races } }` |
| GET | `/worlds/:id` | 世界摘要（势力、关系、要素） |
| GET | `/worlds/:id/distance/:realmA/:realmB` | 两势力距离（race 或 realm id） |
| GET | `/worlds/:id/context?cell=&radius=` | 事件锚点周边上下文 |
| POST | `/worlds/:id/fact-pack?format=llm` | 构建 SpatialFactPack；`format=llm` 返回纯文本 |

世界 JSON 保存在 `worlds/*.json`。

## 与 chronicle-engine 集成

1. 创建编年史世界时调用 `createWorld()`，保存版本化 `spatialBinding`
2. 骨架事件保存确定性 `spatial.anchor`，详述自动取得锚点周边事实
3. 扩写与追问通过只读 `geo_*` 工具补查地图事实
4. 编年史世界信息栏直接显示等距圆柱全球平面图，地名下钻使用局部方位等距地图

地图侧 **永不调用 LLM**；LLM 只消费事实包。

## 地形与许可证

权威海拔由
[`planet_heightmap_generation`（World Orogen）](https://github.com/raguilar011095/planet_heightmap_generation)
的板块动力学、造山与地貌后处理生成，再一对一写回 Cube-sphere 格子。旧 3D
连续噪声后端仅保留为兼容回退。

本实验因直接集成 World Orogen 的 GPL-3.0 源码，按 **GPL-3.0-only** 分发。
上游版本和修改说明见 `vendor/world-orogen/NOTICE.md`。
