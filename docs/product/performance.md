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

### 1. 容器资源与堆内存配比

**目前启动脚本配置：**

- **convert**（start-convert-service.sh）：`-Xms1g -Xmx4g`
- **preview**（start-preview-service.sh）：`-Xms512m -Xmx2g`

#### 调优建议（按容器内存来选）

| 容器内存 | convert 堆配置 | preview 堆配置 |
|---------|---------------|---------------|
| **2G** | `Xms=512m, Xmx≈1.2g` | `Xms=256m, Xmx≈512m` |
| **4G** | `Xms=1g, Xmx≈2.5g` | `Xms=512m, Xmx≈1g` |

**原则：**

> JVM 堆 + 线程栈 + DirectBuffer + native 库 < 容器内存的 **70%** 左右，给 OS 和 LibreOffice 留出空间。

**预期收益：**

- 避免 OOMKill，Full GC 次数明显下降
- 吞吐稳定性提升，延迟尾部显著收敛（**P95/P99 可改善 20–40%**）

### 2. GC 策略

当前已使用：

```bash
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
```

在当前负载类型下基本合适，核心是前面的堆大小与并发控制，**GC 参数暂不建议复杂化**。


## 二、转换服务（fileview-convert）的调优方案

### 1. FileEventConsumer 有界线程池参数调优

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

这是最关键的一层"**总闸门**"。建议按机器配置和容器资源分环境设置：

#### 按容器规格调优

| 容器规格 | core-pool-size | max-pool-size | queue-capacity |
|---------|----------------|---------------|----------------|
| **2C / 2G** | 2 | 4 | 100 |
| **4C / 4G**（默认） | 4 | 8 | 200 |
| **8C / 8G+** | 8 | 16 | 300 |

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

#### 建议

**CPU 紧张时（2C/4C）：**

- 保持 `max-process-count: 1`，避免多个 LibreOffice 进程抢占 CPU
- 如有大量极慢任务，可以把 `task-execution-timeout` 适当下调到 `180000ms`（3 分钟），让极端慢任务尽早失败，释放资源

**CPU 资源充裕时（8C+）：**

- 可以把 `max-process-count` 提到 `2`
- `port-numbers` 增加一个端口（如 `2002,2003,2004`），对应多进程提升并发
- 前提是前面的转换线程池也同步加大，不要只加进程不加线程

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
      cron: "0 0 * * * ?"
```

#### 建议

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

#### 建议调整为

```yaml
spring:
  redis:
    timeout: 2000ms
    lettuce:
      pool:
        min-idle: 8        # 确保有预热好的连接
        max-idle: 16
        max-active: 32     # 或 64，视 Redis 实例能力与服务并发量而定
```

**说明：**

转换服务对 Redis 的调用主要是去重和缓存，延迟过高会拖慢消费速度，适度加大连接池有利于稳定性。


## 三、预览服务（fileview-preview）的调优方案

### 1. RocketMQ 消费线程（下载任务 + 转换完成事件）

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
| **2C** | 2 | 8 |
| **4C** | 4 | 16 |
| **8C** | 8 | 32 |

**调优思路：**

- 如果观察到 CPU 很紧，而 MQ 消费线程很多，可以先把 `consume-thread-max` 降下来
- 如果 CPU 还有余量，且下载/预览事件堆积，可以适当提高 `consume-thread-max` 增加吞吐

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

#### 建议调整为

```yaml
spring:
  data:
    redis:
      timeout: 2000ms     # 或 3000ms
      lettuce:
        pool:
          min-idle: 8
          max-idle: 16
          max-active: 32  # 或 64，取决于预览接口并发
```

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
      connect-timeout: 3000
      read-timeout: 60000
      max-retry: 3
      retry-base-delay: 300
      buffer-size: 65536
```

#### 建议

**带宽紧张且源站不稳定时：**

- `max-retry` 可以从 3 降到 2，减少无谓重试
- 若单文件体积普遍不大，可把 `buffer-size` 从 64KB 调低到 32KB，减小瞬时带宽和内存峰值

**若带宽富余、下载任务是瓶颈：**

- 可以把 `buffer-size` 提高到 128KB，提升单连接吞吐（注意观察内存）

**预期收益：**

> 更合理的下载参数可以在有限带宽下减少相互"抢带宽"的情况，减少超时与重试。

### 5. 预览缓存策略

**配置：**

```yaml
fileview:
  preview:
    cache:
      enabled: true
      default-ttl-hours: 24
      max-cache-size: 1000
```

#### 调优方向

**热点文件较多时：**

- 可以适度提升 `max-cache-size`（如 `2000–5000`），提高命中率

**文件基本"一次性预览"时：**

- 可以把 TTL 降到 `12h` 或更低，减少 Redis 长期占用

**预期收益：**

> 对热点文件场景，可明显减少重复预览请求对转换服务的压力（**重复转换减少 30–70%**）。



## 四、总结

| 优先级 | 调优层面 | 关键配置项 | 预期收益 |
|--------|---------|-----------|---------|
| **P0** | **容器/JVM 资源配比** | `Xms/Xmx`、容器内存 | 避免 OOM，GC 优化，P95/P99 改善 20–40% |
| **P1** | **转换并发与引擎** | `conversion-max-pool-size`、`max-process-count` | CPU 占用降低 30–50%，吞吐提升 30–80% |
| **P2** | **预览 MQ 消费与长轮询** | `consume-thread-max`、`max-timeout` | 降低线程数与资源占用，峰值更稳 |
| **P3** | **Redis 连接池与缓存** | `min-idle/max-active`、`max-cache-size` | 减少长尾延迟，重复转换减少 30–70% |

:::tip 调优建议
建议按优先级从高到低逐步调整，每次调整后观察关键指标（CPU、内存、GC、响应时间）变化，再决定下一步优化方向。
:::
