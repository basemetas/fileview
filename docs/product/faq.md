# 常见问题

## 🚨 预览问题

### 1. 预览的文件长时间没有展现出来

**可能原因：**

#### 1. 转换服务报错

- **排查步骤：**
  - 查看 `fileview-convert` 服务日志
  - 重点关注 `ERROR` 和 `WARN` 级别日志
  - 检查是否有转换异常或引擎启动失败

#### 2. 转换服务没有收到预览服务发送的 MQ 事件

- **排查步骤：**
  1. 检查 RocketMQ 是否健康：
     ```bash
     # 进入 RocketMQ 容器
     docker exec -it <rocketmq-container> /bin/bash
     
     # 查看 topic 列表
     sh mqadmin topicList -n localhost:9876
     ```
  
  2. 检查是否存在所需的 topic：
     - `file-download-topic`
     - `file-conversion-topic`
     - `conversion-result-topic`
  
  3. 如果 topic 不存在，手动创建：
     ```bash
     # 执行初始化脚本
     sh init-rocketmq-topics.sh
     ```

:::tip 提示
预览长轮询默认超时 20 秒，最大 300 秒。如果超过此时间，请检查转换服务和 MQ 状态。详见 [长轮询机制](./polling.md)。
:::

---

### 2. OFD 文件预览展示中文为方框或者字体不对

**原因分析：**

OFD 转换器依赖中文字体，转换过程会到指定字体目录扫描是否存在文件中使用的字体：

- 如果存在 → 使用该字体渲染
- 如果不存在 → 使用思源字体渲染
- 如果缺少思源字体 → 导致渲染为方框

**解决方案：**

1. **安装思源字体**（必须）：
   - Source Han Sans SC（思源黑体）
   - Source Han Serif CN（思源宋体）

2. **Linux 环境安装示例**：
   ```bash
   # 以 Ubuntu/Debian 为例
   apt-get update
   apt-get install -y fonts-noto-cjk
   
   # 或手动下载 TTF/OTF 文件放入
   mkdir -p /usr/share/fonts/truetype/source-han
   # 将字体文件复制到此目录
   fc-cache -fv
   ```

3. **配置字体扫描目录**：
   ```yaml
   ofd:
     font:
       scan-paths:
         - "/usr/share/fonts"
         - "/usr/local/share/fonts"
   ```

:::warning 重要
如果不安装思源字体，OFD 文档中的中文内容可能显示为方框或乱码。详见 [OFD 转换器 - 字体处理三层保障机制](./ofd-converter.md#三、字体处理三层保障机制)。
:::

---

### 3. 部分带密码的文件无法预览

**原因分析：**

带密码的 Office 文件分为不同格式与加密规范：

- **OLE 二进制加密**（老式格式）
- **OOXML 加密**（新式格式）

加密方式不同直接影响转换引擎是否能解密打开。

**当前系统支持情况：**

| 文件类型 | 支持情况 | 说明 |
|---------|---------|------|
| **老式二进制加密** `.doc/.xls/.ppt` | ⚠️ 支持有限 | 多数情况下无法预览 |
| **新式 OOXML 加密** `.docx/.xlsx/.pptx` | ✅ 部分支持 | 对加强加密/企业策略保护的文档仍无法支持 |

**重要说明：**

> 这不是“密码错误”的问题，而是“文件加密类型与转换引擎能力不兼容”的问题。

**目前针对加密文档的处理机制：**

- LibreOffice 对部分老式加密格式进行了黑名单限制：
  ```yaml
  libreoffice:
    encrypted-blacklist: "xls,ppt,dps,dpt"
  ```
- 对于黑名单中的格式，如果文件带密码，将直接跳过 LibreOffice 引擎

详见：
- [文件密码与安全机制](./password.md)
- [LibreOffice 转换器 - 加密文档黑名单](./libreoffice.md#3-加密文档黑名单稳定性保护)

---

## ⚙️ 配置问题

### 4. Redis 连接超时或连接池耗尽

**现象：**
- 预览请求快速增长时，出现大量超时
- 日志中出现 `RedisConnectionException`

**解决方案：**

调整 Redis 连接池配置：

```yaml
spring:
  redis:
    timeout: 2000ms
    lettuce:
      pool:
        min-idle: 8
        max-idle: 16
        max-active: 32  # 或 64
```

详见 [性能调优 - Redis 连接池](./performance.md#5-redis-连接池转换服务)。

---

### 5. 转换服务 CPU 占用过高

**现象：**
- 高并发转换时，CPU 持续打满
- 系统响应变慢

**解决方案：**

1. **调整转换线程池：**
   ```yaml
   convert:
     consumer:
       conversion-core-pool-size: 2
       conversion-max-pool-size: 4
   ```

2. **限制 LibreOffice 进程数：**
   ```yaml
   libreoffice:
     jod:
       max-process-count: 1
   ```

3. **降低 OFD 并行转换线程：**
   ```yaml
   ofd:
     convert:
       parallel:
         max-threads: 2
   ```

详见 [性能调优指南](./performance.md)。

---

### 6. 容器频繁出现 OOMKilled

**原因：**
JVM 堆内存设置过大，超过容器内存限制。

**解决方案：**

按容器内存调整堆大小：

| 容器内存 | convert 堆配置 | preview 堆配置 |
|---------|---------------|---------------|
| **2G** | `Xms=512m, Xmx≈1.2g` | `Xms=256m, Xmx≈512m` |
| **4G** | `Xms=1g, Xmx≈2.5g` | `Xms=512m, Xmx≈1g` |

**原则：**
> JVM 堆 + 线程栈 + DirectBuffer + native 库 < 容器内存的 70% 左右

详见 [性能调优 - 容器与 JVM 层调优](./performance.md#一、容器与-jvm-层调优两个服务通用)。

---

## 🔐 安全问题

### 7. 网络文件预览被拒绝

**现象：**
- 预览网络 URL 文件时提示“域名不在可信列表中”

**原因：**
启用了白名单模式，但目标 URL 的域名未加入白名单。

**解决方案：**

1. 将可信域名添加到配置：
   ```yaml
   fileview:
     network:
       security:
         trusted-sites: example.com, *.mycompany.com
   ```

2. 或者临时禁用白名单：
   ```yaml
   fileview:
     network:
       security:
         trusted-sites: ""  # 清空即禁用白名单
   ```

详见 [安全设置 - 网络文件预览安全控制](./security.md)。

---

### 8. 加密文件需要重复输入密码

**现象：**
- 每次预览加密文件都需要重新输入密码

**原因：**
密码解锁状态 TTL 过短或已过期。

**解决方案：**

调整密码解锁 TTL：

```yaml
fileview:
  preview:
    security:
      password:
        ttlSeconds: 3600  # 默认 1800（30 分钟），可改为 1 小时
```

详见 [文件密码与安全机制](./password.md)。

---

## 🛠️ 转换问题

### 9. CAD 文件转换失败

**排查步骤：**

1. **检查 CAD2X 是否启用：**
   ```yaml
   cad:
     convert:
       cad2x:
         enable: true
   ```

2. **检查 CAD2X 可执行文件路径：**
   ```yaml
   cad2x:
     converter:
       path: /path/to/cad2x  # 生产环境建议显式配置
   ```

3. **检查转换超时设置：**
   ```yaml
   cad2x:
     conversion:
       timeout: 120  # 秒
   ```

详见 [CAD 转换器能力说明](./cad-converter.md)。

---

### 10. LibreOffice 转换卡死或超时

**现象：**
- Office 文档转换长时间没有响应
- 日志中出现超时错误

**解决方案：**

1. **调整 JOD 超时参数：**
   ```yaml
   libreoffice:
     jod:
       task-execution-timeout: 300000  # 5 分钟
       process-timeout: 120000         # 2 分钟
   ```

2. **检查进程池状态：**
   - 查看是否有 LibreOffice 进程僵死
   - 尝试重启转换服务

3. **对于复杂文档：**
   - 适当增加超时时间
   - 或考虑增加 `max-process-count`（多核环境）

详见 [LibreOffice 转换器](./libreoffice.md)。

---

## 📊 性能问题

### 11. 预览响应过慢

**排查顺序：**

1. **检查是否命中缓存：**
   - 首次预览：需要下载 + 转换，耗时较长
   - 重复预览：应该直接命中缓存，响应快

2. **检查 Redis 状态：**
   - Redis 连接是否正常
   - 缓存是否被清理

3. **检查转换服务负载：**
   - CPU / 内存是否过高
   - 转换队列是否积压

**优化建议：**

- 增加缓存 TTL：
  ```yaml
  fileview:
    preview:
      cache:
        conversion:
          success-ttl: 86400  # 24 小时
  ```

- 调整转换并发度：
  ```yaml
  convert:
    consumer:
      conversion-max-pool-size: 8
  ```

详见 [性能调优指南](./performance.md)。

---

### 12. 长轮询超时但文件还未转换完成

**原因：**
- 默认超时 20 秒，大文件可能需要更长时间

**解决方案：**

1. 客户端可以指定更长的超时时间（最大 300 秒）

2. 调整服务端超时限制：
   ```yaml
   fileview:
     preview:
       polling:
         max-timeout: 300  # 最大 300 秒
   ```

3. 调整转换超时：
   ```yaml
   convert:
     consumer:
       conversion-timeout: 180000  # 3 分钟
   ```

详见 [长轮询机制](./polling.md)。

---

## 📝 其他问题

### 13. 如何查看系统支持的文件格式？

系统支持 200+ 文件格式，包括：

- **Office 文档类**：doc, docx, xls, xlsx, ppt, pptx 等
- **图片类**：jpg, png, gif, bmp, svg 等
- **CAD 类**：dwg, dxf 等
- **OFD 国标格式**：ofd
- **压缩包类**：zip, rar, 7z 等
- **代码文件类**：java, python, js 等

完整列表请参考 [支持格式](./formats.md)。

---

### 14. 如何集成到自己的系统中？

系统提供多种集成方式：

1. **HTTP API 调用**：直接调用预览接口
2. **iframe 嵌入**：嵌入预览页面
3. **SDK 封装**：使用 SDK 简化集成
4. **后端服务调用**：微服务间调用

详见 [接入方式](./integration.md)。

---

### 15. 如何排查问题？

**推荐排查顺序：**

1. **查看服务日志**：
   - `fileview-preview` 预览服务日志
   - `fileview-convert` 转换服务日志

2. **检查依赖服务**：
   - Redis 是否正常
   - RocketMQ 是否健康
   - RocketMQ topic 是否存在

3. **检查配置文件**：
   - `application.yml` 配置是否正确
   - 环境变量是否正确

4. **检查资源状态**：
   - 容器内存/CPU 是否足够
   - 磁盘空间是否足够

---

## 更多帮助

如果以上方法未能解决问题，请参考：

- [架构介绍](./architecture.md) - 了解系统架构
- [性能调优指南](./performance.md) - 优化系统性能
- [安全设置](./security.md) - 配置安全策略
- [GitHub Issues](https://github.com/basemetas/fileview) - 提交问题反馈