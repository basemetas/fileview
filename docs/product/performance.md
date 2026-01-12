# 性能调优指南

整体性能调优可以分 **4 个层面**来做，优先级从高到低如下：

1. **容器 / JVM 资源配比**：确保堆大小与容器内存匹配，避免 OOM & 频繁 GC
2. **转换服务并发度与外部引擎**（LibreOffice/JOD）：控制 CPU 密集型任务的并发上限
3. **预览服务的 MQ 消费并发、长轮询策略与下载参数**
4. **Redis 连接池与缓存策略**：避免阻塞和无谓重复计算

:::warning 说明
以下仅提供配置调优方案，不涉及代码修改。
:::


## 一、容器与 JVM 层调优（两个服务通用）

### 1. 启动脚本位置

- **预览服务**: `start-preview-service.sh`
- **转换服务**: `start-convert-service.sh`

### 2. 环境变量配置方式

Fileview 支持通过环境变量动态配置 JVM 参数，推荐在 Docker 部署时使用此方式。

#### 2.1 通过 Docker 运行时传参

```bash
# 预览服务（4C8G 环境示例）
docker run -d \
  -e JAVA_HEAP_MIN=512m \
  -e JAVA_HEAP_MAX=1536m \
  -e JAVA_METASPACE_MIN=128m \
  -e JAVA_METASPACE_MAX=256m \
  -e JAVA_GC_TYPE=G1GC \
  -e JAVA_GC_PAUSE_TIME=100 \
  fileview-preview:latest

# 转换服务（4C8G 环境示例）
docker run -d \
  -e JAVA_HEAP_MIN=1g \
  -e JAVA_HEAP_MAX=3g \
  -e JAVA_METASPACE_MIN=192m \
  -e JAVA_METASPACE_MAX=384m \
  -e JAVA_GC_TYPE=G1GC \
  -e JAVA_GC_PAUSE_TIME=150 \
  fileview-convert:latest
```

#### 2.2 通过 docker-compose.yml 配置

```yaml
services:
  fileview-preview:
    image: fileview-preview:latest
    environment:
      # JVM 堆内存
      JAVA_HEAP_MIN: "512m"
      JAVA_HEAP_MAX: "1536m"
      # 元空间
      JAVA_METASPACE_MIN: "128m"
      JAVA_METASPACE_MAX: "256m"
      # GC 参数
      JAVA_GC_TYPE: "G1GC"
      JAVA_GC_PAUSE_TIME: "100"

  fileview-convert:
    image: fileview-convert:latest
    environment:
      JAVA_HEAP_MIN: "1g"
      JAVA_HEAP_MAX: "3g"
      JAVA_METASPACE_MIN: "192m"
      JAVA_METASPACE_MAX: "384m"
      JAVA_GC_TYPE: "G1GC"
      JAVA_GC_PAUSE_TIME: "150"
```

### 3. 不同环境推荐参数

#### 3.1 预览服务（fileview-preview）

| 参数 | 2C4G | 4C8G | 8C16G | 说明 |
|------|------|------|-------|------|
| `JAVA_HEAP_MIN` | 256m | 512m | 1g | 初始堆内存 |
| `JAVA_HEAP_MAX` | 768m | 1536m | 3g | 最大堆内存 |
| `JAVA_METASPACE_MIN` | 96m | 128m | 256m | 初始元空间 |
| `JAVA_METASPACE_MAX` | 192m | 256m | 512m | 最大元空间 |
| `JAVA_GC_TYPE` | G1GC | G1GC | G1GC | GC 收集器 |
| `JAVA_GC_PAUSE_TIME` | 150 | 100 | 80 | GC 最大暂停时间(ms) |

#### 3.2 转换服务（fileview-convert）

| 参数 | 2C4G | 4C8G | 8C16G | 说明 |
|------|------|------|-------|------|
| `JAVA_HEAP_MIN` | 512m | 1g | 2g | 初始堆内存 |
| `JAVA_HEAP_MAX` | 1536m | 3g | 6g | 最大堆内存 |
| `JAVA_METASPACE_MIN` | 128m | 192m | 256m | 初始元空间 |
| `JAVA_METASPACE_MAX` | 256m | 384m | 512m | 最大元空间 |
| `JAVA_GC_TYPE` | G1GC | G1GC | G1GC | GC 收集器 |
| `JAVA_GC_PAUSE_TIME` | 200 | 150 | 100 | GC 最大暂停时间(ms) |

### 4. JVM 参数说明

#### 4.1 堆内存（Heap）

- **作用**: 存储 Java 对象实例
- **调优原则**:
  - `Xms` 和 `Xmx` 设为相同值，避免堆动态扩容导致的卡顿
  - 预留 20-30% 系统内存给操作系统和其他进程
  - 转换服务因 LibreOffice 进程额外占用，建议预留 30-40% 内存

#### 4.2 元空间（Metaspace）

- **作用**: 存储类元数据（Class Metadata）
- **调优原则**:
  - Spring Boot 应用建议最小 128m
  - 大量使用动态代理/反射的应用可增加到 256m+

#### 4.3 GC 收集器

- **G1GC（推荐）**:
  - 适合堆内存 > 4GB 的场景
  - 低暂停时间，适合响应式应用
  - 通过 `MaxGCPauseMillis` 控制最大暂停时间

- **ParallelGC（备选）**:
  - 适合批处理/高吞吐场景
  - 不推荐用于在线服务

**预期收益：**

- 避免 OOMKill，Full GC 次数明显下降
- 吞吐稳定性提升，延迟尾部显著收敛（**P95/P99 可改善 20–40%**）


## 二、转换服务（fileview-convert）的调优方案

### 1. 转换线程池参数调优

**当前 `application-prod.yml` 配置：**

```yaml
convert:
  consumer:
    message-expire-time: 300000
    conversion-timeout: 120000
    conversion-core-pool-size: 4
    conversion-max-pool-size: 8
    conversion-queue-capacity: 200
```

这是最关键的一层“**总闸门**”。建议按机器配置和容器资源分环境设置：

#### 按容器规格调优

| 容器规格 | core-pool-size | max-pool-size | queue-capacity |
|---------|----------------|---------------|----------------|
| **2C / 2G** | 2 | 4 | 100 |
| **4C / 4G**（默认） | 4 | 8 | 200 |
| **8C / 8G+** | 8 | 16 | 500 |

**调优逻辑：**

- **CPU 顶不住**：优先下调 `max-pool-size`，必要时减小 `core-pool-size`
- **吞吐不够且 CPU 还有余量**：适度提高 `max-pool-size` 和 `queue-capacity`

**预期收益：**

> 在高并发时，避免线程数爆炸导致 CPU 打满和内存吃紧，系统吞吐更稳定，峰值 CPU 占用一般可降低 **30–50%**。

### 2. LibreOffice / JODConverter 进程池调优

**配置：**

```yaml
libreoffice:
  jod:
    enabled: true
    office-home: /usr/share/libreoffice
    port-numbers: 2002,2003
    max-tasks-per-process: 100
    task-execution-timeout: 300000  # 300s
    task-queue-timeout: 30000       # 30s
    process-timeout: 120000         # 120s
    process-retry-interval: 250
    max-process-count: 1
```

#### 按容器规格调优

| 参数 | 2C4G | 4C8G | 8C16G | 说明 |
|------|------|------|-------|------|
| `port-numbers` | 2002,2003 | 2002,2003,2004,2005 | 2002-2009（8个） | LibreOffice 进程端口列表 |
| `max-tasks-per-process` | 50 | 100 | 200 | 单个进程最大任务数 |
| `task-execution-timeout` | 180000 | 240000 | 300000 | 单个任务超时时间(ms) |
| `max-process-count` | 1 | 2 | 4 | 进程池大小 |

**调优说明：**

- `port-numbers`: LibreOffice 进程端口列表，**数量 = 并发转换能力**
- `max-tasks-per-process`: 单个进程最大任务数，超过后自动重启进程
- `task-execution-timeout`: 单个任务超时时间，复杂文档建议 300s+
- `max-process-count`: 进程池大小，建议为 `CPU核心数 / 2`

**关键性能影响：**

- 每个 LibreOffice 进程占用约 **200-400MB** 内存
- `port-numbers` 数量直接决定并发转换能力
- 2C4G 环境建议最多 2 个进程，避免内存不足

**预期收益：**

> 在多核环境下，转换吞吐可提升 **30–80%**；在小机器上则通过限制进程数避免系统抖动。

### 3. OFD 多页并行转换调优

**配置：**

```yaml
ofd:
  convert:
    default-target-format: pdf
    parallel:
      min-pages: 3
      max-threads: 4
```

#### 建议

**CPU 紧张时：**

- 将 `max-threads` 从 4 调低到 2
- 或提高 `min-pages`（比如从 3 调到 5），只对页数较大的 OFD 才启用并行

**CPU 充裕且 OFD 任务多：**

- `max-threads` 可以设为与 CPU 核数相当或略低，例如 4C 则 3~4
- 但要配合总线程池（FileEventConsumer）一起看，避免"外面有界、里面又开一堆线程"

**预期收益：**

> 降低大文件并行转换对 CPU 的冲击，减少尖峰负载，综合延迟更稳定。

### 4. 临时文件清理与磁盘使用

**配置：**

```yaml
libreoffice:
  temp:
    dir: /opt/fileview/data/libreoffice
    cleanup:
      max-age-hours: 1
      cron: "0 */30 * * * ?"  # 每30分钟执行一次
```

#### 按容器规格调优

| 容器规格 | max-age-hours | cron | 说明 |
|---------|---------------|------|------|
| **2C4G** | 1 | `0 */30 * * * ?` | 30分钟清理一次 |
| **4C8G** | 1 | `0 */15 * * * ?` | 15分钟清理一次 |
| **8C16G** | 1 | `0 */10 * * * ?` | 10分钟清理一次 |

**调优说明：**

- 磁盘空间或 inode 紧张时，可将 `max-age-hours` 从 1 降到 `0.5`（30 分钟）左右
- 若磁盘压力不大，可保持当前设置，避免频繁删除/创建带来的 IO 抖动

**预期收益：**

> 防止临时目录长时间堆积导致磁盘满盘，从而引发级联故障。

### 5. Redis 连接池（转换服务）

**当前配置：**

```yaml
spring:
  redis:
    timeout: 5000ms
    lettuce:
      pool:
        max-active: 20
        max-idle: 8
        min-idle: 0
```

#### 按容器规格调优

| 容器规格 | max-active | max-idle | min-idle | timeout |
|---------|------------|----------|----------|---------|
| **2C4G** | 20 | 8 | 2 | 2000ms |
| **4C8G** | 40 | 16 | 5 | 2000ms |
| **8C16G** | 80 | 32 | 10 | 2000ms |

**调优说明：**

- `min-idle`: 确保有预热好的连接，避免冷启动时连接建立延迟
- `max-active`: 最大连接数，建议为 `CPU核心数 * 10`
- `timeout`: 转换服务对 Redis 的调用主要是去重和缓存，延迟过高会拖慢消费速度

**预期收益：**

> 适度加大连接池有利于稳定性，在高并发缓存读/写场景下，减少连接池耗尽和长时间等待。


## 三、预览服务（fileview-preview）的调优方案

### 1. 事件引擎消费调优

#### 1.1 RocketMQ 消费线程（下载任务 + 转换完成事件）

**当前配置：**

```yaml
rocketmq:
  consumer:
    consume-thread-min: 5
    consume-thread-max: 20
```

#### 按容器规格调优

| 容器规格 | consume-thread-min | consume-thread-max |
|---------|-------------------|-------------------|
| **2C4G** | 5 | 20 |
| **4C8G** | 10 | 40 |
| **8C16G** | 20 | 80 |

**调优说明：**

- 消费线程数直接影响下载任务并发处理能力
- `min` 建议为 `CPU核心数`，`max` 建议为 `CPU核心数 * 10`
- 如果观察到 CPU 很紧，而 MQ 消费线程很多，可以先把 `consume-thread-max` 降下来
- 如果 CPU 还有余量，且下载/预览事件堆积，可以适当提高 `consume-thread-max` 增加吞吐

#### 1.2 Redis Streams 事件引擎调优（当 `mq.engine=redis` 时）

当产品配置为使用 Redis Streams 作为事件引擎时，可从以下四个方向进行调优：

##### Stream 容量与保留策略

**当前配置：**

```yaml
mq:
  redis:
    stream:
      max-length: 50000   # 写入后 trim 上限
      trim-length: 10000  # 定期清理保留数量
```

**调优建议：**

按 **"峰值吞吐 × 预期保留时长"** 估算容量：

- **估算方法：**
  - 假设峰值 QPS = 200 msg/s
  - 希望保留 10–20 分钟数据 → 200 × 1200 = 24 万条
  - 单条消息约 1KB，24 万条 ≈ 240MB

- **推荐配置：**

| 场景 | max-length | trim-length | 预期内存占用 |
|------|-----------|-------------|-------------|
| **低负载**（<100 msg/s） | 50000 | 10000 | ~50MB |
| **中等负载**（100–300 msg/s） | 100000 | 20000 | ~100MB |
| **高负载**（>300 msg/s） | 200000 | 50000 | ~200MB |

**预期收益：**

> 在高峰期控制 Stream 容量，防止 Redis 内存无限膨胀，同时保留足够历史用于异常排查。

##### 消费者读取参数调优

**关键参数：**

```java
// 批量大小、阻塞时间、调度频率
StreamReadOptions.empty()
  .count(10)                    // 每次读取条数
  .block(Duration.ofSeconds(2)) // 阻塞等待时间
  
@Scheduled(fixedDelay = 200)    // 调度间隔
```

**调优方案：**

| 参数 | 默认值 | 调优建议 | 适用场景 |
|------|--------|---------|----------|
| **count** | 10 | 50–100 | 高吞吐场景，单条处理快 |
|  |  | 20–50 | CPU 密集型处理 |
| **block** | 2s | 3–5s | 流量不稳定，降低空转 |
|  |  | 1–2s | 追求低延迟 |
| **fixedDelay** | 200ms | 1000ms | block 时间较长时 |

**调优示例：**

```yaml
# 高吞吐场景配置
count: 50
block: 3s
fixedDelay: 500ms
```

**预期收益：**

> - 批量大小从 10 提升到 50，理论吞吐可提升 **3–5 倍**
> - 减少 Redis 调用频率，降低 CPU 和网络开销

##### 消费者并发度控制

**扩展方式：**

1. **水平扩容服务实例**
   - 多个预览/转换服务实例
   - 同一消费组下自动负载均衡
   - 每条消息只被一个 consumer 消费

2. **服务内业务处理并发**
   - 保持 Redis Streams 读取单线程
   - 在 `onMessage()` 内使用线程池并发处理
   - 避免多个读线程导致 ACK 混乱

**建议：**

- 优先使用"单线程读取 + 业务线程池"模式
- 根据 CPU 使用率和任务堆积情况调整线程池大小
- 避免盲目增加读取线程数

##### Redis 连接池配置（Streams 专用）

**关键原则：**

```yaml
spring:
  data:
    redis:
      timeout: 3000ms  # 必须 > block 时间
      lettuce:
        pool:
          max-active: 16
          max-idle: 8
          min-idle: 2
```

**调优规则：**

- **timeout 与 block 匹配：**
  - timeout ≥ block + 1~2s
  - 例如 block=5s 时，timeout 应设为 6~7s

- **连接池容量：**
  - 预览服务：max-active=16~32
  - 转换服务（Redis 访问较多）：max-active=32~64
  - 避免盲目拉大，浪费连接资源

**预期收益：**

> 避免因超时配置不当导致请求失败，确保高并发下连接池稳定。

##### 监控与告警

**必须监控的指标：**

1. **Stream 长度（XLEN）**
   - `stream:file-events`
   - `stream:preview-events`
   - `stream:download-tasks`
   - 告警阈值：接近 `max-length` 的 70–80%

2. **Pending 列表（XPENDING）**
   - 大量 pending 且 idle 时间长 → 消费不及时或死信
   - 需人工介入处理

3. **消费延迟**
   - 在消息头添加 `createdAt` 时间戳
   - 消费时记录 `now - createdAt`
   - 毫秒级正常，秒级升高需增加并发

4. **Redis 服务端指标**
   - 内存使用率
   - key 数量
   - 慢查询日志

**调优闭环：**

通过监控量化调优效果：
- 调大 `count` → 观察 Redis QPS、CPU、平均延迟变化
- 调整容量参数 → 观察内存曲线是否在可接受范围

##### 可落地的调优步骤

1. **重新设定容量参数**
   ```yaml
   max-length: 100000
   trim-length: 20000
   ```

2. **提升批量读取大小**
   ```java
   count: 50  // 从 10 提升到 50
   ```

3. **调整超时匹配**
   ```yaml
   block: 2~3s
   timeout: block + 1~2s
   ```

4. **监控观察后决定下一步**
   - XLEN / Pending 明显积压 → 增加服务实例
   - CPU 有余量 → 增大业务线程池
   - Redis 连接不够 → 调整 max-active

**预期综合收益：**

> - 吞吐量提升 **3–5 倍**
> - Redis QPS 降低 **30–50%**
> - 内存占用可控，避免无限膨胀

### 2. Redis 连接池（预览服务）

**当前配置：**

```yaml
spring:
  data:
    redis:
      timeout: 5000ms
      lettuce:
        pool:
          max-active: 20
          max-idle: 10
          min-idle: 5
```

#### 按容器规格调优

| 容器规格 | max-active | max-idle | min-idle | timeout |
|---------|------------|----------|----------|---------|
| **2C4G** | 20 | 10 | 5 | 3000ms |
| **4C8G** | 40 | 20 | 10 | 3000ms |
| **8C16G** | 80 | 40 | 20 | 3000ms |

**调优说明：**

- `max-active`: 最大连接数，建议为 `CPU核心数 * 10`
- `max-idle`: 空闲连接数，建议为 `max-active / 2`
- `min-idle`: 最小保持连接，避免冷启动时连接建立延迟

**预期收益：**

> 在高并发缓存读/写场景下，减少连接池耗尽和长时间等待，降低长尾延迟。

### 3. 长轮询策略（预览结果轮询）

**配置：**

```yaml
fileview:
  preview:
    polling:
      default-timeout: 20
      max-timeout: 300
      default-interval: 1000
      min-interval: 500
      max-interval: 5000
      smart-strategy:
        phase1-attempts: 10
        phase1-interval: 1000
        phase2-attempts: 20
        phase2-interval: 2000
        phase3-interval: 5000
```

#### 调优建议

若用户等待时长能接受，且长轮询请求很多：

- 把 `max-timeout` 从 300 降到 `120–180` 秒
- 将 `phase3-interval` 从 5000 调到 `8000–10000` 毫秒

这样可以减少活跃轮询线程数量和 CPU/上下文切换。

**预期收益：**

> 在大量并发轮询场景下，有助于降低线程数和资源占用，使系统在高峰期更稳。

### 4. 网络下载参数（带宽与重试）

**配置：**

```yaml
fileview:
  network:
    download:
      connect-timeout: 5000
      read-timeout: 120000
      max-retry: 5
      retry-base-delay: 500
      buffer-size: 131072  # 128KB
```

#### 按容器规格调优

| 容器规格 | buffer-size | connect-timeout | read-timeout | max-retry |
|---------|-------------|-----------------|--------------|------------|
| **2C4G** | 131072 (128KB) | 5000 | 120000 | 5 |
| **4C8G** | 262144 (256KB) | 5000 | 120000 | 5 |
| **8C16G** | 524288 (512KB) | 5000 | 120000 | 5 |

**调优说明：**

- `buffer-size`: 下载缓冲区大小，影响网络文件下载速度
- `read-timeout`: 读取超时，大文件建议 120s+
- `max-retry`: 失败重试次数，网络不稳定环境可增加

**预期收益：**

> 更合理的下载参数可以在有限带宽下减少相互“抢带宽”的情况，减少超时与重试。

### 5. 预览缓存策略

**配置：**

```yaml
fileview:
  preview:
    cache:
      enabled: true
      max-cache-size: 1000
      conversion:
        success-ttl: 864000  # 240小时（10天）
        failed-ttl: 60       # 60秒
      direct-preview-ttl: 864000
```

#### 按容器规格调优

| 容器规格 | max-cache-size | success-ttl | failed-ttl |
|---------|----------------|-------------|------------|
| **2C4G** | 1000 | 864000 (10天) | 60 |
| **4C8G** | 2000 | 864000 (10天) | 60 |
| **8C16G** | 5000 | 864000 (10天) | 60 |

**调优说明：**

- `max-cache-size`: 内存缓存条目数，单个条目约 2-5KB
- `success-ttl`: 成功预览结果缓存时长（秒）
- `failed-ttl`: 失败结果短时缓存，避免重复尝试

**预期收益：**

> 对热点文件场景，可明显减少重复预览请求对转换服务的压力（**重复转换减少 30–70%**）。



## 四、性能监控指标

### 1. JVM 监控

#### 1.1 查看堆内存使用情况

```bash
# 进入容器
docker exec -it fileview-convert bash

# 查看 JVM 进程 PID
jps -l

# 查看堆内存详情
jmap -heap <PID>

# 查看 GC 统计
jstat -gcutil <PID> 1000 10
```

#### 1.2 关键指标

| 指标 | 正常范围 | 异常阈值 | 处理建议 |
|------|---------|---------|----------|
| 堆内存使用率 | 50-70% | >85% | 增加 `Xmx`，检查内存泄漏 |
| Old Gen 占比 | <70% | >85% | 调整 GC 参数，排查内存泄漏 |
| Full GC 频率 | <5次/小时 | >10次/小时 | 增加堆内存，优化对象创建 |
| GC 暂停时间 | <200ms | >500ms | 调整 `MaxGCPauseMillis` |

### 2. 应用监控

#### 2.1 预览服务关键指标

```bash
# 查看 Redis 连接数
redis-cli INFO clients | grep connected_clients

# 查看下载任务队列长度
redis-cli LLEN stream:download-tasks

# 查看缓存命中率
# 在应用日志中搜索 "Cache Hit" / "Cache Miss"
```

#### 2.2 转换服务关键指标

```bash
# 查看 LibreOffice 进程数
ps aux | grep soffice | wc -l

# 查看转换任务队列长度
redis-cli LLEN stream:convert-tasks

# 查看临时文件占用
du -sh /opt/fileview/data/libreoffice
```

### 3. 系统资源监控

```bash
# CPU 使用率
top -bn1 | grep "Cpu(s)"

# 内存使用情况
free -h

# 磁盘 IO
iostat -x 1 5

# 网络流量
iftop -i eth0
```


## 五、常见问题排查

### 1. 转换服务 OOM（内存溢出）

#### 症状

- 日志出现 `java.lang.OutOfMemoryError`
- 容器频繁重启
- 生成 `heap_dump.hprof` 文件

#### 排查步骤

1. **查看堆内存配置**

```bash
docker exec fileview-convert env | grep JAVA_HEAP
```

2. **分析堆转储文件**

```bash
# 使用 MAT (Memory Analyzer Tool) 分析
# 或使用 jmap
jmap -dump:live,format=b,file=heap.hprof <PID>
```

3. **解决方案**

- **临时方案**: 增加 `JAVA_HEAP_MAX`（如 2C4G → 1536m 改为 2g）
- **长期方案**:
  - 检查 `port-numbers` 数量，减少 LibreOffice 进程
  - 降低 `conversion-max-pool-size`，控制并发
  - 升级服务器资源到 4C8G

---

### 2. 转换超时

#### 症状

- 日志显示 `ConversionTimeoutException`
- 前端轮询超时返回 `CONVERTING` 状态

#### 排查步骤

1. **检查超时配置**

```yaml
# fileview-convert/application-prod.yml
libreoffice:
  jod:
    task-execution-timeout: 180000  # 当前值
convert:
  consumer:
    conversion-timeout: 120000  # 当前值
```

2. **查看 LibreOffice 进程状态**

```bash
ps aux | grep soffice
```

3. **解决方案**

- 增加超时时间到 240s 或 300s
- 检查文件是否过大（>50MB 建议拆分）
- 检查文件是否损坏或加密

---

### 3. 预览服务下载缓慢

#### 症状

- 网络文件下载耗时过长
- `DOWNLOADING` 状态持续超过 30s

#### 排查步骤

1. **检查网络配置**

```yaml
fileview:
  network:
    download:
      buffer-size: 131072  # 当前缓冲区大小
      read-timeout: 120000
```

2. **测试网络连通性**

```bash
# 进入容器测试下载速度
curl -o /dev/null -w "%{speed_download}\n" <文件URL>
```

3. **解决方案**

- 增加 `buffer-size` 到 256KB 或 512KB
- 检查出口带宽限制
- 对于内网文件，配置 `trusted-sites` 跳过安全校验

---

### 4. Redis 连接池耗尽

#### 症状

- 日志出现 `Could not get a resource from the pool`
- 请求响应变慢或超时

#### 排查步骤

1. **查看连接池配置**

```bash
# 查看 Redis 当前连接数
redis-cli INFO clients | grep connected_clients

# 查看应用配置的连接池大小
grep "max-active" application-prod.yml
```

2. **检查是否有连接泄漏**

```bash
# 查看应用日志中是否有未释放连接的警告
grep "Connection leak" logs/*.log
```

3. **解决方案**

- 增加 `max-active`（2C4G: 20 → 40）
- 检查代码是否正确关闭 Redis 连接
- 检查 Redis 服务器 `maxclients` 配置


## 六、总结

| 优先级 | 调优层面 | 关键配置项 | 预期收益 |
|--------|---------|-----------|---------|
| **P0** | **容器/JVM 资源配比** | `Xms/Xmx`、容器内存 | 避免 OOM，GC 优化，P95/P99 改善 20–40% |
| **P1** | **转换并发与引擎** | `conversion-max-pool-size`、`max-process-count` | CPU 占用降低 30–50%，吞吐提升 30–80% |
| **P2** | **预览事件消费与长轮询** | `consume-thread-max` / `count` / `max-timeout` | 吞吐提升 3–5 倍，Redis QPS 降低 30–50% |
| **P3** | **Redis 连接池与缓存** | `min-idle/max-active`、`max-cache-size` | 减少长尾延迟，重复转换减少 30–70% |

:::tip 调优建议
建议按优先级从高到低逐步调整，每次调整后观察关键指标（CPU、内存、GC、响应时间）变化，再决定下一步优化方向。
:::
