# 服务集成

安装并启动成功后，简单几部就可以集成文件预览服务到自己的业务系统。

## 依赖项

预览参数需要做序列化后 base64 编码，所以会用到 `js-base64` 库

```html
<!-- cdn 方式引入 -->
<script src="https://cdn.jsdelivr.net/npm/js-base64@3.7.8/base64.min.js"></script>
```

```js
// esm 方式引入
import { Base64 } from "js-base64";
```

## 预览远程文件

```js
// 构造参数
const opts = {
  path: "", // 服务器上的本地文件路径，例如 /opt/myfiles/sample.docx
  url: "https://mydomain.com/myfiles/sample.docx", // 网络文件地址，支持 http/https/ftp
  fileName: "sample.docx", // 真实文件名，用作文件类型判断，如果文件地址中没有正确文件后缀，则必须手动传递
  displayName: "网络示例文档", // 用于标题栏等展示的文件名，非必需
};

// 对参数进行base64编码
const base64Data = encodeURIComponent(Base64.encode(JSON.stringify(opts)));

// 构造预览地址
const previewUrl = `https://yourPreviewService/preview/view?data=${base64Data}`;
window.open(previewUrl, "_blank");
```

## 预览本地文件

```js
// 构造参数
const opts = {
  path: "/opt/myfiles/sample.docx", // 服务器上的本地文件路径，例如 /opt/myfiles/sample.docx
  fileName: "sample.docx", // 真实文件名，用作文件类型判断，如果文件地址中没有正确文件后缀，则必须手动传递
  displayName: "本地示例文档", // 用于标题栏等展示的文件名，非必需
};

// 对参数进行base64编码
const base64Data = encodeURIComponent(Base64.encode(JSON.stringify(opts)));

// 构造预览地址
const previewUrl = `https://yourPreviewService/preview/view?data=${base64Data}`;
window.open(previewUrl, "_blank");
```

## 子目录部署场景

系统支持子目录部署，具体见 [子目录部署](/docs/install/docker#子目录部署)

此时预览服务的路径则为 `https://yourPreviewService/<subpath>/preview/view?data=${base64Data}`
