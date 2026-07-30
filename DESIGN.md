# Geo Engine 设计

Geo Engine 是编年史系统的确定性空间事实层。地图生成、气候、水文、生态、魔法地理、
物种承载力和势力扩张全部由算法与 seed 驱动；LLM 只读取压缩后的事实，不参与地图模拟。

## 设计原则

- **地图侧永不调用 LLM**：地形、河湖、距离、承载力和势力边界均可复现。
- **LLM 只消费事实**：通过 `SpatialFactPack` 与 Geo–Chronicle v1 工具按需查询。
- **稳定空间引用**：格子使用 `face:u:v`，持久化要素使用类型、ID 和锚点格。
- **模拟与显示分离**：Cube-sphere 格子是权威模拟数据；WebGL、墨卡托和等距圆柱只是视图。
- **分层粒度**：L0 默认每面 `128×128`，局部细分留给后续 drill-down。

## 生成管线

```text
World Orogen 板块/造山/侵蚀
  → 海拔写回 Cube-sphere
  → 主海洋连通域与格子地形分类
  → 气候与 52 周水循环
  → 径流、河流、湖泊、岛屿与植被
  → 魔法节点与灵脉
  → 物种承载力与势力扩张
  → SpatialFactPack / Geo–Chronicle v1
```

默认权威地形后端为 vendored World Orogen。它在球面点集上生成板块、边界、造山与侵蚀
海拔，再按原始顺序一对一写回 Cube-sphere 格心。旧连续噪声后端仅作为
`terrain.backend = "noise"` 的兼容回退。Orogen 内部邻接只服务地质生成；后续水文、
生态和势力仍使用 Cube-sphere 邻接。

World Orogen 来源为
[`raguilar011095/planet_heightmap_generation`](https://github.com/raguilar011095/planet_heightmap_generation)，
按 GPL-3.0 分发；版本与修改记录见 `vendor/world-orogen/NOTICE.md`。

## 地形与水体契约

- 只有最大的海平面以下连通域保留为主海洋，封闭小盆地先填为陆地。
- 水文阶段可将满足条件的洼地重新识别为湖泊；湖格地形必须为 `lake`。
- 地形分类包含 `deep_ocean`、`ocean`、`lake`、`coast`、`plain`、`hill`、
  `mountain`、`snow` 和 `ice`。
- 河流来自水循环径流与坡降，不使用固定流量源；河流到湖岸或海岸终止。
- 海洋、陆地与湖泊颜色分区平滑，禁止跨海岸混色。

## 3D 可读性约束

- WebGL 深度以朝向观察者的一侧为近面，背面线条必须被球体遮挡。
- 地形位移只帮助辨认高低，最大视觉夸张不超过球半径的 4%。
- 旋转矩阵必须保持单位球长度，宽高比变化不得拉伸球体。
- 经纬线和河流贴近基准球面，默认只显示可见半球。

## Geo–Chronicle 契约

`src/facts/chronicle-contract.js` 提供：

- 地图要素搜索与稳定空间引用解析；
- 按事件类型确定性推荐锚点；
- 魔法、淡水和湖泊面积等空间约束校验；
- 按公里半径查询锚点上下文。

Chronicle 保存版本化 `spatialBinding` 与事件 `spatial.anchor`。扩写和追问通过只读
`geo_*` 工具补查事实；地图缺失的事实不得由文本生成器臆造。

## 后续

- L2 局部细分与跨层空间引用。
- 沿 realm 邻接格精确计算 `borderKm`。
- 增强湖盆、海峡和流域的长期演化模型。
