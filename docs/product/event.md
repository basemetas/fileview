# 消息机制（Event-driven Architecture）

## 总体说明

为提升系统的 **解耦性、稳定性与可扩展性**,预览产品整体采用 **事件驱动架构（Event-driven Architecture）**。

在该架构下，预览服务 与 转换服务 不再进行同步直连调用，而是通过统一的 **事件总线（MQ）** 进行异步协作。

事件机制将"预览请求 → 转换执行 → 结果回传"这一过程组织为一条 **松耦合的事件流**，显著提升系统在高并发、复杂转换场景下的弹性与可靠性。


## 一、MQ 在整体架构中的作用

当前产品后端由两类核心服务组成：

- **预览服务（Preview Service）**
- **转换服务（Convert Service）**

MQ 在两者之间承担 **事件总线（Event Bus）** 的角色，主要体现在以下三方面。

### 1. 预览 → 转换：异步投递转换任务

当预览服务接收到前端预览请求时：

- 不直接同步调用转换接口
- 而是通过统一的 `EventPublisher`：
  - 发布 `FILE_EVENTS` / `PREVIEW_EVENTS` / `DOWNLOAD_TASKS` 等业务事件
  - 底层由 MQ 引擎（RocketMQ 或 Redis Streams）承载

转换服务作为事件消费者：

- 从 MQ 中消费事件
- 异步执行文件转换任务

### 2. 转换 → 预览：结果回传与状态更新

转换完成后：

- 转换服务通过 MQ 发布 **转换完成事件**
- 预览服务消费事件并：
  - 更新状态
  - 刷新缓存
  - 生成或更新预览 URL

### 3. 解耦与异步化收益

- 服务间无 HTTP 强依赖
- 转换服务短暂不可用时，消息可暂存于 MQ
- 可随时扩展新的事件消费者（审计、统计、监控等）

**一句话总结：**  
MQ 将"预览请求—转换执行—结果回传"串联为一条松耦合的事件流。


## 二、事件引擎选择与统一配置说明

系统当前内置 **两套可切换的事件通道实现**：

- RocketMQ
- Redis Streams

通过统一配置项 `mq.engine` 进行选择。

### 1. 事件引擎选择配置

```yaml
mq:
  engine: ${MQ_ENGINE:redis}
```

**优先级：**

```
环境变量 MQ_ENGINE > 启动参数 > application.yml
```

**可选值：**

- `redis`（默认）
- `rocketmq`

该配置将直接影响：

- MQ 相关 Bean 的加载
- EventPublisher 的具体实现
- 消息投递与消费方式


## 三、RocketMQ 事件方案配置说明

RocketMQ 更适合 **高可靠、可追溯、生产级负载** 场景。

### 1. RocketMQ 核心配置（按模块区分）

#### 转换服务（Convert Service）

```yaml
rocketmq:
  producer:
    group: file-convert-producer
    send-message-timeout: 3000
  consumer:
    group: file-convert-consumer
```

- `producer.group`：转换服务发送事件的生产者组
- `send-message-timeout`：发送超时（3 秒）
- `consumer.group`：转换服务消费任务事件的消费者组

#### 预览服务（Preview Service）

```yaml
rocketmq:
  producer:
    group: preview-producer-group
    send-message-timeout: 30000
  consumer:
    group: preview-consumer-group
    consume-thread-min: 5
    consume-thread-max: 20
```

- 预览服务发送事件较少，但等待时间更长
- 消费线程池支持并发回传处理

### 2. 条件装配机制

```java
@Configuration
@ConditionalOnProperty(name = "mq.engine", havingValue = "rocketmq")
public class RocketMQConfig { ... }
```

仅当 `mq.engine=rocketmq` 时：

- RocketMQ 相关 Bean 才会初始化
- 避免在 Redis 模式下：
  - 因 RocketMQ 未部署导致启动失败

### 3. 适用场景总结

- 大规模转换任务
- 结果需要审计、追溯
- 高并发、生产环境首选


## 四、Redis Streams 事件方案配置说明

Redis Streams 更适合 **轻量级、低延迟、依赖少** 的场景。

### 1. Redis Streams 核心配置

```yaml
mq:
  redis:
    stream:
      max-length: 50000
      trim-length: 10000
```

- `max-length`：写入时 Stream 最大长度
- `trim-length`：定期清理后保留的消息数量

### 2. 双层容量控制机制

#### 写入时裁剪

```java
redisTemplate.opsForStream().add(streamKey, body);
redisTemplate.opsForStream().trim(streamKey, maxLength, true);
```

- 每次写入后立即裁剪
- 使用 approximate trimming，性能优先

#### 定期清理任务

```java
@Scheduled(cron = "0 0 * * * ?")
redisTemplate.opsForStream().trim(streamKey, trimLength, true);
```

- 每小时执行
- 清理已消费历史消息，防止内存膨胀

### 3. 条件装配与降级

```java
@ConditionalOnProperty(name = "mq.engine", havingValue = "redis")
public class RedisStreamEventPublisher { ... }
```

Redis 不可用时：

- 仅记录日志
- 不抛异常
- 不影响主业务流程

### 4. 适用场景总结

- 开发 / 测试环境
- 实时性要求高但可容忍有限丢失
- 希望减少中间件依赖的部署环境


## 五、统一事件抽象与路由模型

### 1. EventPublisher 抽象接口

```java
public interface EventPublisher {
    void publish(EventChannel channel, Object payload, Map<String, Object> headers);
    void publishAsync(EventChannel channel, Object payload, Map<String, Object> headers);
}
```

### 2. 业务事件通道（EventChannel）

```java
FILE_EVENTS        // 文件转换事件
PREVIEW_EVENTS     // 预览事件
CONVERT_EVENTS     // 转换完成事件
DOWNLOAD_TASKS     // 下载任务
```

### 3. 通道到 MQ 的映射关系

| EventChannel | RocketMQ | Redis Streams |
|--------------|----------|---------------|
| FILE_EVENTS | file-events:{tag} | stream:file-events |
| PREVIEW_EVENTS | preview-events:{tag} | stream:preview-events |
| DOWNLOAD_TASKS | download-tasks | stream:download-tasks |


## 六、双引擎可切换设计的产品级优势

- **业务无感知：** 代码只依赖 EventPublisher
- **环境可调：**
  - 测试 → Redis
  - 生产 → RocketMQ
- **可扩展性强：**
  - 后续可接入 Kafka 等第三种 MQ
- **统一监控视角：**
  - 以业务事件为核心，而非 MQ 产品


## 七、小结

- 采用 **事件驱动架构** 解耦预览与转换
- 内置 **RocketMQ / Redis Streams** 双事件引擎
- 通过配置即可切换，业务代码无需修改
- Redis 轻量低延迟，RocketMQ 高可靠可追溯
- 完善的容量控制与容错机制
- 为未来多消费者、多事件通道扩展预留空间

该事件机制是预览产品的重要基础设施能力，为大规模文件预览、转换与下载场景提供了稳定、可演进的系统支撑。
