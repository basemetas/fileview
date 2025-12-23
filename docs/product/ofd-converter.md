# OFD 转换器能力说明

为支持 OFD（Open Fixed-layout Document，国家标准电子文件格式）的在线预览，系统内置 **OFD 转换器**，可将 OFD 文件转换为 **PDF、图片、SVG、HTML、文本** 等多种可预览格式，并针对多页文档提供并行转换优化与 **完整的字体处理与容错机制**，保障中文及嵌入字体在转换过程中的显示质量。


## 一、OFD 转换器配置说明

系统通过 `application.yml` 对 OFD 转换能力进行集中配置：

```yaml
ofd:
  convert:
    # 默认转换目标格式
    default-target-format: pdf

    # 并行转换配置
    parallel:
      min-pages: 3
      max-threads: 4

  # 字体配置
  font:
    # 额外字体扫描目录（可选）
    scan-paths:
      # - "/usr/share/fonts"
      # - "/usr/local/share/fonts"
```


## 二、核心配置项语义说明

### 1. 默认目标格式策略

- **配置项**：`ofd.convert.default-target-format`
- **作用**：当未显式指定目标格式时，OFD 文件的默认转换输出格式。

**行为说明：**

- 若调用方仅发起“预览 OFD 文件”请求：
  - 系统将自动使用该配置作为目标格式。
- 当前默认值为 `pdf`，如果后续希望：
  - 默认转图片 → 可改为 `png` / `jpg`
  - 默认转文本 → 可改为 `txt`

:::tip 配置改行为
无需改代码，仅调整该配置即可改变系统级 OFD 默认输出行为。
:::

### 2. 多页 OFD 并行转换机制

OFD 转换在 **图片 / SVG** 等场景下支持 **按页并行渲染**，以提升大文档转换效率。

#### 并行启用阈值

- **配置项**：`ofd.convert.parallel.min-pages`
- **含义**：OFD 页数达到该值时，允许启用并行转换优化。
- **默认值**：`3`

**行为规则：**

- 页数 `< min-pages`：
  - 使用串行转换，避免并行调度开销。
- 页数 `≥ min-pages`：
  - 进入并行可选路径。

#### 并行线程上限

- **配置项**：`ofd.convert.parallel.max-threads`
- **含义**：并行转换时允许使用的最大线程数。
- **默认值**：`4`

**行为规则：**

- 系统内部按该值创建 OFD 并行转换线程池。
- 多页渲染任务最多同时执行 `max-threads` 个页面转换。

#### 并行与串行的协同策略

为保证 **稳定性与页面顺序正确性**：

1. 优先尝试串行转换。
2. 若串行路径失败，再自动切换到并行模式。
3. 并行仅作为 **性能优化与兜底手段**，而非强制路径。

### 3. 字体扫描与中文渲染保障

OFD 文档通常依赖外部字体，尤其是中文字体。系统提供 **三层字体处理保障机制**，避免转换后出现中文乱码或"方块字"。

- **配置项**：`ofd.font.scan-paths`
- **作用**：指定额外的字体目录，用于 OFD 转 PDF / 图片时扫描字体。

**字体加载规则：**

1. 优先加载你在 `scan-paths` 中显式配置的目录。
2. 自动补充系统常见字体目录（Linux 环境）：
   - `/usr/share/fonts`
   - `/usr/local/share/fonts`
   - `/opt/fonts`
   - `/app/fonts`
   - `$HOME/.fonts`

**效果说明：**

- 转换过程中会递归扫描 `TTF / OTF / TTC` 等字体文件。
- 扫描到的字体将注册到 OFD 渲染引擎（OFDRW），用于文字渲染。

可以有效保障：

- 中文正文
- 思源字体（宋体/黑体）
- 行业定制字体

等在预览中的正常显示。


## 三、字体处理三层保障机制

系统对 OFD 字体处理采用 **三层保障策略**，确保中文及嵌入字体在各种环境下都能正确渲染。

### 1. JVM / 系统层环境保障

在系统启动时，通过 `EnvironmentUtils` 初始化中文环境：

```java
EnvironmentUtils.initializeChineseEnvironment();
```

**核心配置：**

- `file.encoding = UTF-8`
- `sun.jnu.encoding = UTF-8`
- `java.awt.headless = true`

**功能保障：**

- 检测可用中文字体
- 子进程环境变量设置（如 `LANG=en_US.UTF-8`）
- 保证 JVM / 外部进程稳定运行，减少字体异常

### 2. 字体扫描与注册层

通过 `FontUtils` + `OfdFontProperties` 扫描并注册字体：

**扫描入口：**

```java
OfdConvertStrategy.loadSourceHanFontsToOFDRW(...)
```

**扫描逻辑：**

```java
List<String> scanPaths = FontUtils.getFontDirectories(ofdFontProperties.getScanPaths());
for (String dir : scanPaths) {
    if (目录存在且可读) {
        fontLoader.scanFontDir(dir);
    }
}
```

**扫描顺序：**

1. 配置目录（`ofd.font.scan-paths`）
2. 系统默认字体目录（Linux）

**效果：**

- 使用 OFDRW 的 `FontLoader` 注册扫描到的 TTF / OTF / TTC 字体
- 保证 OFD 渲染中文及嵌入字体时有字体可用

### 3. OFD 转换容错层

在 `OfdConvertStrategy` 中对字体异常进行检测和 **多级降级处理**。

#### 异常识别

通过 `FontUtils.isFontRelatedError` 检测字体相关异常：

```java
if (isFontRelatedError(e)) {
    logger.warn("检测到字体相关异常，尝试无字体模式处理");
    return convertOfdToImageWithoutFont(...);
}
```

#### 多级降级路径

系统提供 **四级降级策略**，保证转换不因字体缺失而完全失败：

1. **正常模式** → 标准字体渲染
2. **无字体模式** → 跳过部分字体加载
3. **资源修复模式** → 尝试修复缺失资源
4. **简化兜底模式** → 至少输出第一页保证可预览

:::tip 容错优先
优先输出可预览结果，其次优化字体效果，避免因字体问题导致转换完全失败。
:::

#### PDF / OFD 容错环境

系统会设置以下 OFDRW 容错属性：

```properties
ofdrw.font.fallback=true
ofdrw.font.ignoreErrors=true
ofdrw.font.useSystemFallback=true
ofdrw.font.enableSmartMapping=true
```

**作用：**

- 字体缺失时使用系统 / 指定兜底字体替代
- 忽略非致命字体错误
- 启用智能映射优化显示效果


## 四、兜底字体策略（思源系列）

系统采用 **思源字体系列** 作为中文字体兜底方案，保证在字体缺失时仍能正常显示中文内容。

### 1. 工具层兜底：`FontUtils.guessFallbackFont`

根据字体名称智能推荐兜底字体：

- **无原字体名** → `Source Han Serif CN`（思源宋体）
- **字体名包含 "hei/黑/sans/yahei"** → `Source Han Sans SC`（思源黑体）
- **其他情况** → `Source Han Serif CN`（思源宋体）

### 2. OFD 内部字体映射：`checkUnmappedFonts`

对 OFD 内部未映射字体进行自动映射：

```java
String fallbackFont = FontUtils.guessFallbackFont(原字体名);
FontLoader.addAliasMapping(原字体名, fallbackFont);
```

**保证：** 所有缺失字体最终落到思源系列，避免出现方块字。

### 3. 扫描与注册中优先关注思源字体

- 手动扫描并注册 `Source Han` 系列 OTF 文件
- 日志标记注册成功的思源字体
- 对 OFD 渲染器提供明确兜底映射


## 五、OFD 格式能力范围

系统为 OFD 文件内置明确的能力矩阵：

- **源格式**：`ofd`
- **支持的目标格式：**
  - `pdf`
  - `png / jpg / jpeg`
  - `svg`
  - `html`
  - `txt`

转换时将根据目标格式自动路由至对应实现路径，例如：

- **PDF** → 高保真 PDF 转换路径；
- **图片 / SVG** → 支持多页并行渲染与中文字体渲染；
- **HTML / TXT** → 面向文本与结构化内容的导出能力。


## 六、整体转换流程小结

### 1. 入口识别

- 扩展名为 `.ofd` 的文件会被识别为 OFD 类型。
- 请求进入统一转换调度后，路由至 OFD 转换策略。

### 2. 默认行为规则

- 未指定目标格式：
  - 使用 `ofd.convert.default-target-format` 作为目标输出格式。
- 页数 `< min-pages`：
  - 采用串行转换路径。
- 页数 `≥ min-pages`：
  - 串行优先，失败后尝试并行转换。
- 并行线程数：
  - 实际并发页数不超过 `max-threads`。

### 3. 字体加载与渲染

**三层保障机制：**

1. **JVM / 系统层**：初始化 UTF-8 编码 + 无头模式 + 中文字体检测
2. **扫描注册层**：配置目录 + 系统字体目录 → OFDRW FontLoader 注册
3. **容错降级层**：字体异常检测 → 多级降级（无字体模式 → 资源修复 → 简化兜底）

**兜底字体：**

- 思源宋体（`Source Han Serif CN`）
- 思源黑体（`Source Han Sans SC`）
- 缺失字体自动映射至思源系列，避免方块字

保障中文与复杂排版在 PDF / 图片 / SVG 预览中的显示质量。


## 七、总结

- **国标格式原生支持**  
  内置 OFD 转换能力，满足政务、档案、电子公文等国标 OFD 场景。

- **默认行为可配置**  
  默认输出格式、并行阈值与线程上限均可通过配置调整。

- **性能与稳定性平衡**  
  并行转换只在必要时启用，优先保证小文件的简洁路径与整体稳定性。

- **字体处理三层保障**  
  - JVM/系统环境稳定（UTF-8 + 中文字体检测）
  - 字体扫描注册（配置目录 + 系统目录 → OFDRW）
  - 异常检测与多级降级，保证转换不失败

- **兜底字体明确**  
  思源宋体 / 思源黑体，缺失字体均映射至思源系列。

- **中文显示有保障**  
  可扩展的字体扫描机制 + 智能降级策略，避免 OFD 中文渲染问题，提升阅读体验。
