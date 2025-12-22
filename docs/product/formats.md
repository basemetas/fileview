# 支持格式列表

Fileview 支持超过 200 种文件格式的在线预览，覆盖办公文档、图片、音视频、CAD、代码等主流文件类型。

## 📄 Office 文档类

### Word / 文档类
**Word 文档格式：**
- doc, docx, dot, dotx, dotm, docm
- wps, wpt, rtf

**文本文档格式：**
- txt
- Markdown：md, markdown, mdown, mkd, mkdn, mdwn, mdtxt, mdx
- HTML/标记：html, htm
- XML 系列：xml, xsd, xsl, xslt
- TeX/LaTeX：tex, ltx, bib, cls, sty, ins, dtx
- 其他：rst, log, conf

### Excel / 表格类
**表格文档格式：**
- xls, xlsx, xlsm, xlt, xltx, xltm, ods, ots, fods
- xla, xlam, et, ett, csv


### PowerPoint / 演示类
**演示文档格式：**
- ppt, pptx, dps, dpt, pptm, pot, potx, potm, odp, otp, fodp


## 📋 版式文档类

### PDF / OFD 格式
- **PDF：** pdf
- **OFD：** ofd（国产版式文档标准）



## 🖼️ 图片类

**常见图片格式：**
- jpg, jpeg, png, webp, gif, svg

**专业图片格式：**
- bmp, psd, tif, tiff, tga
- emf, wmf（Windows 图元文件）



## 🎬 音视频类

### 音频格式
- **主流音频：** mp3, m4a, wav, aac, ogg, flac
- **其他音频：** ac3, au, wma, aif, aifc, aiff

### 视频格式
- **主流视频：** mp4, webm, avi, mkv, mov, flv
- **其他视频：** m4v, mpg, mpeg, m2v, m4p, mj2, ogv, qt, vob, wmv



## 📦 压缩包类

**支持的压缩格式：**
- zip, jar, rar, 7z
- tar, tar.gz, tgz

支持在线浏览压缩包内文件列表及目录结构。



## 🏗️ CAD / 工程图类

**CAD 格式：**
- dwg, dxf

适用于建筑、机械、工程等行业的图纸在线预览。



## 🎨 3D 模型类

**支持的 3D 格式：**
- gltf, glb, obj, stl, fbx, ply
- dae, wrl, 3ds, 3mf, 3dm

适用于工业设计、游戏开发、建筑可视化等场景。



## 🗺️ 流程图 / 思维导图类

**Visio / 流程图：**
- vsd, vsdm, vsdx, vssm, vssx, vstm, vstx

**在线绘图工具格式：**
- bpmn（业务流程建模）
- drawio（流程图）
- xmind（思维导图）



## 💻 代码 / 脚本类

### 前端开发
**Web 前端：**
- JavaScript：js, jsx, mjs, cjs
- TypeScript：ts, tsx
- 框架：vue, svelte
- 样式：css, scss, sass, less

### 后端开发
**Java 系列：**
- java, jsp, jspx, jhtml, tag
- groovy, gvy, gsh, grvy
- scala, sc, kt, kts

**C/C++ 系列：**
- c, cpp, cc, cxx, h, hpp, hxx, hh

**C# / .NET：**
- cs, cshtml, razor

**脚本语言：**
- Python：py, pyw, pyt, pyx, pyo, rpy
- Go：go, gomod, gohtml
- PHP：php, php3, php4, php5, phtml, phpt
- Ruby：rb, rake, thor, ru
- Lua：lua
- R：r, rmd, rnw
- Rust：rs
- Swift：swift
- Dart：dart
- Perl：pl, pm, t, pod
- Erlang：erl, hrl
- Elixir：ex, exs
- Haskell：hs, lhs

**Shell / Bash：**
- sh, bash, zsh, fish, ksh, csh, tcsh
- bashrc, bash_profile, cmd

**汇编 / 底层：**
- asm, s

**Objective-C：**
- m, mm, objc, objcpp

### 配置 / 数据格式
**数据格式：**
- json, geojson, ldjson, json5
- yaml, yml

**数据库脚本：**
- sql, pgsql, sqlite, db, db3, dsql

**构建工具：**
- gradle, cmake, gyp

**基础设施即代码：**
- Terraform：tf, tfvars, hcl
- Docker：Dockerfile
- Git：gitignore
- Nginx：conf, nginx

**模板引擎：**
- ejs, jade, pug, vbhtml

**其他配置：**
- conf, schema, http, rest



## 📚 电子书类

**电子书格式：**
- epub

支持 ePub 格式电子书的在线阅读。



## 格式支持说明


:::warning 加密文档支持
**Office 文档加密支持：**
- 支持预览带密码保护的 Office 文档（Word、Excel、PowerPoint）
- 包括格式：doc, docx, xlsx, pptx 等
- 用户需在预览时输入正确密码，系统解密后进行预览
- 密码验证失败时会提示重新输入

**压缩包加密支持：**
- 支持预览带密码的压缩包文件
- 包括格式：zip, rar, 7z 等主流压缩格式
- 输入密码后可浏览压缩包内文件列表及目录结构
- 支持对压缩包内的文件进行在线预览（需相应格式支持）
:::

:::tip 持续更新
我们不断扩展支持的文件格式，如有特殊格式需求，欢迎联系我们。
:::
