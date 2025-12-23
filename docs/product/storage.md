# 文件存储机制

## 一、 总体说明

系统通过 `fileview.storage` 统一配置文件存储策略，用于控制预览模块内部采用哪种**文件存储服务实现**（FileStorageService）。

### 1. 支持的存储模式

当前版本支持三种存储模式：

| 存储类型 | 状态 | 说明 |
|---------|------|------|
| **local** | ✅ 完整可用（默认） | 已在当前版本正式启用 |
| **remote** | ⚠️ 预览侧已实现 | 依赖外部文件服务配套 |
| **oss** | ⏳ 仅占位实现 | SDK 尚未接入，不建议生产启用 |

系统会根据配置自动选择对应的存储实现，并在预览、转换、回调、缓存等链路中统一使用。


## 二、 配置结构

### 1. 完整配置示例

在 `application.yml`（预览模块）中：

```yaml
fileview:
  storage:
    # 存储类型: local | remote | oss
    type: local

    # 本地存储配置
    local:
      base-path: d:/myWorkSpace/fileview-backend/fileTemp
      path-mapping:
        enabled: false
        from: /var/app/fileview-backend
        to: d:/myWorkSpace/fileview-backend

    # 远程文件服务器配置
    remote:
      server-url: http://file-server:8080
      access-key:
      secret-key:
      timeout: 30000

    # OSS 对象存储配置
    oss:
      provider: aliyun
      access-key:
      secret-key:
      bucket: fileview-storage
      endpoint: oss-cn-hangzhou.aliyuncs.com
      url-expiration-hours: 1
```

### 2. 核心配置说明

**`fileview.storage.type`**

用于选择文件存储策略：
- `local`：本地磁盘 / 挂载盘（默认）
- `remote`：独立的远程文件服务器
- `oss`：对象存储（OSS / S3 / MinIO 等）

**配置段说明**

`local` / `remote` / `oss` 三段配置分别由对应的 FileStorageService 实现类读取和生效。


## 三、 本地存储方案（local）

### 1. 方案说明

:::tip 推荐使用
本地存储模式下，文件直接存放在预览服务可访问的磁盘或挂载目录中，是当前版本**最稳定、最完整、已正式启用**的存储方案。
:::

### 2. 核心能力

#### 1. 统一物理根路径

- `local.base-path` 作为所有文件的物理根目录
- 所有文件读写、删除、大小获取均在此目录下完成

```yaml
local:
  base-path: /data/fileview/storage
```



#### 2. 容器路径映射（path-mapping）

解决 Docker / 容器内路径与宿主机路径不一致的问题。

**配置示例：**

```yaml
local:
  base-path: /var/app/fileview-backend/fileTemp
  path-mapping:
    enabled: true
    from: /var/app/fileview-backend
    to: d:/myWorkSpace/fileview-backend
```

**功能说明：**
- 支持将容器内路径自动映射为宿主机真实路径
- 对异常路径（重复映射、混合盘符）做规范化修正
- 确保跨环境文件路径一致性



#### 3. 对外预览 URL 生成

基于动态 `baseUrl`（来自请求头 / 反向代理），通过预览服务自身的文件访问接口生成：

```
{baseUrl}/preview/api/file?filePath=...&t=...
```

**特性：**
- 与[预览地址生成机制](/docs/product/preview-url)完全一致
- 天然兼容反向代理、多环境部署
- 自动适配 HTTPS、子路径等场景



#### 4. 完整文件能力

- ✅ 文件存在性检测
- ✅ 本地文件流读取
- ✅ 文件保存 / 删除
- ✅ 文件大小获取



### 3. 适用场景

本地存储方案在当前版本中**功能完整、实现成熟**，适用于：

- ✅ 开发环境
- ✅ 单机部署
- ✅ 容器 + 挂载盘部署
- ✅ 生产环境（推荐）

与动态 `baseUrl`、容器路径映射等机制形成完整闭环，可直接用于生产环境。



## 四、 远程文件服务器方案（remote）

### 1. 方案说明

在 `type: remote` 模式下，预览服务不直接管理文件，而是通过 HTTP 将所有文件操作代理给一个独立的文件服务器。

### 2. 已实现能力（预览侧）

预览服务已内置完整的 Remote 文件访问适配器，支持：

#### 1. 预览 URL 拼接

```
{server-url}/preview/api/files/{path}?t=...
```

#### 2. 文件操作接口

| 操作 | 接口 | 说明 |
|------|------|------|
| 存在性检查 | `GET /api/files/exists` | 检查文件是否存在 |
| 文件下载 | `GET /api/files/download` | 下载文件内容 |
| 文件上传 | `POST /api/files/upload` | 上传文件 |
| 文件删除 | `DELETE /api/files/delete` | 删除文件 |
| 大小查询 | `GET /api/files/size` | 获取文件大小 |



### 3. 当前限制说明

:::warning 依赖外部服务
- ✅ 预览服务这一侧的 HTTP 客户端逻辑是**完整的**
- ⚠️ 但 `server-url` 指向的远程文件服务器**并不包含在当前项目中**
- 是否能真正使用，取决于是否存在一个实现 `/api/files/*` 与 `/preview/api/files/*` 接口规范的**外部文件服务**
:::



### 4. 配置示例

```yaml
fileview:
  storage:
    type: remote
    remote:
      server-url: http://file-server:8080
      access-key: your-access-key
      secret-key: your-secret-key
      timeout: 30000
```



### 5. 产品层结论

- ✅ **已实现**：预览服务具备对远程文件中心的完整适配能力
- ⚠️ **待配套**：需自行部署或对接符合接口规范的文件服务器
- 属于 **"预览端已准备好，需外部系统配合"** 的方案



## 五、 对象存储方案（oss）

### 1. 方案说明

`type: oss` 为对象存储的预留模式，当前版本仅用于方案占位与结构预留。

### 2. 已实现内容（非常有限）

#### 1. URL 生成

```
https://{bucket}.{endpoint}/{filePath}
```

仅做字符串拼接，假定对象存储桶为公开访问。

#### 2. 保存 / 删除

- 仅输出日志，返回"成功"结果
- **未真正调用**任何云厂商 SDK 或 API



### 3. 明确未实现内容

- ❌ 文件存在性检测
- ❌ 文件下载 / 文件流读取
- ❌ 文件大小获取
- ❌ 预签名 URL（`url-expiration-hours` 未生效）
- ❌ `access-key` / `secret-key` 未参与任何真实鉴权



### 4. 配置示例（仅占位）

```yaml
fileview:
  storage:
    type: oss
    oss:
      provider: aliyun  # aliyun | aws | minio
      access-key: your-access-key
      secret-key: your-secret-key
      bucket: fileview-storage
      endpoint: oss-cn-hangzhou.aliyuncs.com
      url-expiration-hours: 1
```



### 5. 产品层结论

:::danger 不建议生产使用
当前 OSS 模式属于**占位 / 伪实现**：
- 看起来像 OSS
- 实际未接入任何对象存储
- **不建议在生产环境启用**
:::

### 6. 若要落地真实 OSS 方案

需要完成以下工作：

1. 按 `provider` 集成对应 SDK（Aliyun / S3 / MinIO）
2. 用 AK/SK 创建客户端
3. 将所有文件操作改为真实 SDK 调用
4. 使用 `url-expiration-hours` 生成预签名访问链接



## 六、 存储方案对比

| 特性 | local | remote | oss |
|------|-------|--------|-----|
| **实现状态** | ✅ 完整 | ⚠️ 预览侧完整 | ⏳ 仅占位 |
| **文件读写** | ✅ 本地磁盘 | ✅ HTTP 代理 | ❌ 未实现 |
| **预览 URL** | ✅ 动态生成 | ✅ 远程拼接 | ⚠️ 简单拼接 |
| **路径映射** | ✅ 支持 | - | - |
| **部署依赖** | 无 | 需外部文件服务 | 需 OSS SDK |
| **推荐场景** | 开发、生产 | 分布式文件中心 | 暂不推荐 |
| **生产可用** | ✅ 推荐 | ⚠️ 需配套 | ❌ 不推荐 |



## 七、 使用建议

### ✅ 推荐：本地存储（local）

**适用场景：**
- 单机部署
- Docker + 挂载盘
- 开发测试环境
- 生产环境（推荐）

**配置示例：**

```yaml
fileview:
  storage:
    type: local
    local:
      base-path: /data/fileview/storage
      path-mapping:
        enabled: true
        from: /var/app
        to: /host/path
```



### ⚠️ 可选：远程文件服务器（remote）

**适用场景：**
- 已有独立文件服务中心
- 需要统一文件管理
- 分布式部署

**前提条件：**
- 必须有符合接口规范的文件服务器
- 需实现 `/api/files/*` 和 `/preview/api/files/*` 接口



### ❌ 不推荐：对象存储（oss）

**当前状态：**
- 仅占位实现
- SDK 未接入
- 不建议生产使用

**待完善：**
- 需集成云厂商 SDK
- 需实现真实文件操作
- 需支持预签名 URL



## 八、 故障排查

### 1. 问题：本地存储文件路径错误

**可能原因：**
1. `base-path` 配置不正确
2. 容器路径映射未启用或配置错误
3. 路径权限问题

**排查步骤：**
1. 检查 `base-path` 是否存在且有读写权限
2. 确认容器内外路径映射配置
3. 查看应用日志中的实际文件路径



### 2. 问题：远程文件服务器连接失败

**可能原因：**
1. `server-url` 不可访问
2. 文件服务器未实现标准接口
3. 网络超时或防火墙限制

**排查步骤：**
1. 测试 `server-url` 连通性
2. 检查文件服务器日志
3. 调整 `timeout` 配置



## 九、 相关文档

- [预览地址生成机制](/docs/product/preview-url)
- [架构介绍](/docs/product/architecture)
- [接入方式](/docs/product/integration)
