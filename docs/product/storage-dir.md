# 文件目录与存储配置说明（Preview Storage）

## 总体说明

本文档用于说明预览服务在**文件目录层面**的设计与配置方式，帮助部署人员与使用方理解：

- 文件到底存在哪里
- 预览服务自身需要哪些工作目录
- 两套配置（`fileview.storage` 与 `fileview.preview.storage`）如何协同而不冲突


## 一、结论先行

> **`fileview.storage` 管“文件存储后端在哪里”，`fileview.preview.storage` 管“预览服务自己如何使用这些目录”。**

- 两者职责不同、前缀不同、互不覆盖
- 只要路径规划一致，即可协同工作


## 二、`fileview.preview.storage`：预览服务自身的目录配置

### 1. 配置项概览（`application.yml`）

```yaml
fileview:
  preview:
    storage:
      preview-dir: /var/app/fileview-backend/fileTemp/preview
      temp-dir: /var/app/fileview-backend/fileTemp/temps
      upload-dir: /var/app/fileview-backend/fileTemp/uploads
      download-dir: /var/app/fileview-backend/fileTemp/downloads
      uncompress-dir: /var/app/fileview-backend/fileTemp/source/uncompress
      max-file-size-mb: 100
```

### 2. 各配置项含义说明

| 配置项 | 说明 |
|--------|------|
| `preview-dir` | 预览结果输出目录，如 Word→PDF、Excel→PNG 等转换后的文件 |
| `temp-dir` | 预览过程中的临时目录，用于存放中间文件，生命周期较短 |
| `upload-dir` | 上传文件落盘目录，用于本地文件上传预览场景 |
| `download-dir` | 网络文件下载目录，用于 URL 文件预览场景 |
| `uncompress-dir` | 压缩包 / EPUB 解压目录，用于解压后直接访问内部资源 |
| `max-file-size-mb` | 单文件大小限制（MB），超过将直接拒绝预览 |


## 三、`fileview.preview.storage` 在系统中的实际作用

### 1. 统一绑定与生效方式

预览服务通过统一配置类 `StorageConfig` 读取并管理上述配置：

- 自动绑定 `fileview.preview.storage.*`
- 提供字节级文件大小校验能力
- 为预览流程提供默认目录路径

**配置值优先级：**

- `application.yml` > 代码内默认值


### 2. 文件大小限制（资源保护）

在所有预览流程开始前，都会先校验文件大小：

- 超过 `max-file-size-mb` → **直接拒绝**
- 不进入下载 / 转换 / IO 流程

**适用场景：**

- 本地文件预览
- 网络文件预览
- 压缩包 / EPUB 文件


### 3. 网络文件下载目录控制

当使用网络文件预览接口（如 `/preview/api/netFile`）时：

- 若请求中**未指定下载目录**
- 系统自动使用 `fileview.preview.storage.download-dir`

这样可以：

- 统一下载文件的存储位置
- 便于权限控制与清理
- 防止任意路径写入风险


### 4. 预览结果输出目录

当未指定预览结果输出路径时：

- 自动使用 `preview-dir`
- 所有转换后的文件统一落在该目录
- 前端访问的 `previewUrl` 通常指向这里


### 5. 压缩包 / EPUB 解压目录与安全控制

`uncompress-dir` 用于：

- ZIP / RAR 等压缩包预览
- EPUB 电子书首次访问时的自动解压

**安全设计要点：**

- 解压目录与下载目录分离
- EPUB 访问路径受下载目录白名单限制
- 防止路径遍历与越权访问


## 四、`fileview.preview.storage` 与 `fileview.storage` 的区别与关系

### 1. 核心定位差异

| 配置项 | 核心职责 |
|--------|----------|
| `fileview.storage` | 文件存储后端抽象（本地 / 远程 / OSS） |
| `fileview.preview.storage` | 预览服务自身的工作目录与大小限制 |

**一句话概括：**

- `fileview.storage`：文件“**存在哪个系统、如何对外访问**”
- `fileview.preview.storage`：预览服务“**在这个系统里如何组织文件**”

### 2. 是否会发生配置冲突？

> **不会。**

原因如下：

- 配置前缀完全不同
- 绑定类不同
- Spring 不存在重复绑定

两者在 Spring 配置层面**互不覆盖、互不干扰**。


## 五、推荐的目录规划方式（示意）

假设：

```yaml
fileview:
  storage:
    local:
      base-path: d:/myWorkSpace/fileview-backend/fileTemp
```

推荐目录结构如下：

```text
d:/myWorkSpace/fileview-backend/fileTemp        ← 存储根目录
├─ preview/                                     ← 预览结果
├─ temps/                                       ← 临时文件
├─ uploads/                                     ← 上传文件
├─ downloads/                                   ← 网络下载文件
└─ source/
    └─ uncompress/                              ← 解压目录（ZIP / EPUB）
```

**理解方式：**

- `base-path` 是系统级文件根目录
- `preview.storage.*` 是预览服务在根目录下划分的“工作区”


## 六、典型请求流转示意

![文件目录与存储流程图](/images/filedir.png)

### 图示说明（对外文案版）

1️⃣ **客户端请求入口**

- 支持本地文件上传预览
- 支持网络 URL 文件预览
- 所有请求统一进入预览服务

2️⃣ **文件落盘与安全控制**

- 上传文件 → `uploads/`
- 网络文件 → `downloads/`
- 所有文件先进行大小限制校验
- 超限文件直接拒绝，不进入后续流程

3️⃣ **预览与转换处理**

- 需要转换的文件进入转换处理流程
- 转换产物统一输出到 `preview/`
- 中间过程文件存放于 `temps/`

4️⃣ **压缩包 / EPUB 特殊处理**

- ZIP / EPUB 等文件先解压
- 解压内容放入 `uncompress/`
- 后续直接基于解压目录进行资源访问

5️⃣ **存储后端与访问 URL**

- 底层存储支持：本地磁盘 / 远程文件服务 / 对象存储（OSS）
- 存储服务负责：管理文件位置，生成对外可访问的 `previewUrl`

6️⃣ **返回预览地址**

- 预览服务最终返回 `previewUrl`
- 前端可直接通过 HTTP 打开预览结果
- 无需关心底层存储与目录结构

:::tip 一句话串联全图
预览服务在统一的存储根目录下，通过上传、下载、解压、转换等多个受控子目录完成文件处理，最终由存储后端生成可访问的预览地址并返回给客户端，实现安全、可控、可扩展的文件预览流程。
:::


## 七、整体总结

> `fileview.storage` 决定“文件用什么存储后端以及如何暴露访问”，`fileview.preview.storage` 决定“预览服务在该存储后端上如何组织目录、限制文件大小并完成预览流程”。

两者不是竞争关系，而是**上下分层、相互配合**的关系。
