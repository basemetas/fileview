# LibreOffice 转换器能力说明

Fileview 预览服务内置 LibreOffice 作为核心文档转换器之一，用于将 Office / 演示 / 表格 / Visio 等文件转换为可预览格式。在实现上同时支持 **服务进程模式（JODConverter）** 与 **命令行模式（CLI）**，并通过配置与策略控制二者的启用条件与回退关系。

## 一、 概览

整体可总结为三层控制：

### 1. 引擎运行层（`libreoffice.*`）

决定 LibreOffice 是否启用、以何种方式运行（CLI / JOD）、超时、临时目录、加密文档黑名单等。

### 2. 服务进程层（`libreoffice.jod.*`）

控制长期运行的 LibreOffice 服务进程池（端口、并发、超时）。

### 3. 文档类型策略层（`word / excel / ppt / visio.convert.*`）

决定某一类文档是否优先使用 LibreOffice，以及失败后的回退策略。



## 二、LibreOffice 顶层配置（运行方式控制）

### 1. 启用与基础运行参数

```yaml
libreoffice:
  enable: true
  command:
    path: /usr/local/bin/soffice
  headless: true
  invisible: true
  conversion:
    timeout: 120
```

**语义说明：**

| 配置项 | 说明 |
|--------|------|
| `libreoffice.enable` | 全局开关。关闭后，所有基于 LibreOffice 的转换都会被跳过，由上层策略选择其它引擎 |
| `command.path` | 指定实际执行的 LibreOffice / soffice 二进制路径 |
| `headless / invisible` | 控制是否以无界面方式运行，适用于服务器环境 |
| `conversion.timeout` | 单次转换的最大执行时间（秒），超时将强制终止进程并视为失败 |

### 2. CLI 模式的临时目录隔离

```yaml
libreoffice:
  temp:
    dir: /var/app/fileview-backend/fileTemp/libreoffice
```

**行为说明：**

- CLI 模式下，每次转换都会在 `temp.dir` 下创建一个独立的 LibreOffice 实例目录
- 该目录仅用于本次转换，避免并发时共享配置导致锁冲突
- 转换结束后会立即清理该实例目录

:::info 预留配置
`temp.cleanup.max-age-hours`、`temp.cleanup.cron` 当前为预留配置，暂未启用定时扫描清理逻辑。
:::

### 3. 加密文档黑名单（稳定性保护）

```yaml
libreoffice:
  encrypted-blacklist: "xls,ppt,dps,dpt"
```

**语义说明：**

- 用于限制「带密码文件 + LibreOffice 引擎」的组合
- 对于列入黑名单的格式，如果文件带密码，将直接跳过 LibreOffice
- 上层转换策略会自动回退到其它引擎处理

:::warning 稳定性保护
该机制用于规避 LibreOffice 在某些旧格式加密文件上的不稳定行为。
:::


## 三、JODConverter 模式（服务进程转换）

### 1. JOD 模式配置

```yaml
libreoffice:
  jod:
    enabled: true
    office-home: /usr/share/libreoffice
    port-numbers: 2002,2003
    max-tasks-per-process: 100
    task-execution-timeout: 300000
    task-queue-timeout: 30000
    process-timeout: 120000
```

**语义说明：**

| 配置项 | 说明 |
|--------|------|
| `libreoffice.jod.enabled=true` | 启用 **服务进程模式**，系统启动时会拉起 LibreOffice 进程池 |
| `office-home` | LibreOffice 安装目录 |
| `port-numbers` | 服务进程监听端口（支持多端口并行） |
| 各类 `timeout` | 用于控制任务执行、排队与进程重试，防止任务长期阻塞 |

### 2. JOD 模式的能力特性

✅ **核心优势：**

- LibreOffice 以 **长期驻留进程池方式**运行
- 支持 **带密码文档的加载与转换**
- 多次转换可复用同一进程，性能与稳定性更适合在线服务场景
- 同样受「加密文档黑名单」保护，避免不稳定格式触发崩溃


## 四、CLI 模式（临时进程转换）

当 JOD 模式未启用或不可用时，系统会自动降级为 **CLI 模式**：

| 特性 | 说明 |
|------|------|
| **运行方式** | 每次转换都会临时启动一个 `soffice` 进程 |
| **生命周期** | 转换完成后立即退出 |
| **密码支持** | ❌ 不支持带密码文档 |
| **超时控制** | 受 `conversion.timeout` 严格限制，超时即终止 |

:::tip CLI 模式定位
CLI 模式更偏向于：**简单、隔离、低耦合**，但功能受限。
:::


## 五、文档类型级别的引擎选择策略

```yaml
word:
  convert:
    engine:
      priority: libreoffice
      fallback: true
    libreoffice.enable: true
```

**（Excel / PPT / Visio 配置结构一致）**

### 策略含义

| 配置项 | 说明 |
|--------|------|
| `engine.priority: libreoffice` | 该类型文档转换时，优先尝试 LibreOffice 引擎 |
| `fallback: true` | 当 LibreOffice 转换失败、不支持或被跳过时，允许回退到其它引擎 |
| `libreoffice.enable` | 控制该文档类型是否允许使用 LibreOffice（叠加全局开关） |


## 六、总结

### ✨ 核心特性

1. **LibreOffice 是预览系统中的核心通用转换器**
2. **支持 服务进程模式（JOD） 与 命令行模式（CLI） 自动切换**

### 🔄 模式对比

| 模式 | 适用场景 | 密码支持 | 配置控制 |
|------|----------|----------|----------|
| **JOD 模式** | 适合长期在线服务 | ✅ 支持带密码文档 | 由 `libreoffice.jod.*` 精细控制 |
| **CLI 模式** | 简单可靠、强隔离 | ❌ 不支持密码 | 作为降级与兜底方案存在 |

### 🛡️ 容错机制

**文档类型策略 + 回退机制**，确保在复杂文件场景下：

> **"尽量可预览，而不是直接失败"**


:::info 配置建议
- 生产环境推荐启用 **JOD 模式**，获得更好的性能和功能支持
- 合理设置 `max-tasks-per-process` 和各类 `timeout`，避免资源耗尽
- 根据实际文件类型特点，调整 `encrypted-blacklist` 提升稳定性
:::
