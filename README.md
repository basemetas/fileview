<div align="center">
  <h1> BaseMetas Fileview 在线文件预览引擎</h1>
  <p>新一代通用型在线文件预览引擎，全格式覆盖，跨平台，零依赖</p>
  <a href="https://github.com/BaseMetas/fileview/blob/main/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/BaseMetas/fileview"></a>
  <a href="https://hub.docker.com/r/basemetas/fileview/tags"><img alt="Docker Image Version (tag)" src="https://img.shields.io/docker/v/basemetas/fileview/latest"></a>
  <a href="https://github.com/BaseMetas/fileview/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/BaseMetas/fileview?style=flat-square"></a>
  <a href="https://hub.docker.com/r/basemetas/fileview/tags"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/basemetas/fileview"></a>
  <a href="https://github.com/BaseMetas/fileview/issues"><img src="https://img.shields.io/github/issues-closed/BaseMetas/fileview?style=flat-square" alt="closed issues"></a>
</div>

## 特性

#### 全格式覆盖，一套能力支撑所有文档场景

支持 Office、PDF、OFD 及 CAD、图片、代码文件、流程图、思维导图等数百种格式，统一预览入口，屏蔽格式差异，满足 OA、档案、网盘、IM、审批流等复杂业务场景需求。

#### 快速接入，轻量级开发

通过标准化接口即可快速接入文档预览服务，无需复杂改造，只需少量代码即可完成集成，显著降低开发成本，缩短上线周期。

#### 跨平台多终端适配

支持 PC 与 H5 多终端访问，兼容主流浏览器环境（Chrome 60+），文档内容可根据不同终端智能适配与重排，满足桌面端与移动端的统一在线预览需求。

#### 无依赖、零插件

无需依赖本地 Office 环境，也无需安装任何浏览器插件，即可通过浏览器实现文档在线预览，部署与使用更加轻量、可靠。

## 相关站点

- 官方文档 https://fileview.basemetas.cn
- 在线体验 https://file.basemetas.cn

## 开源地址

- [Github] https://github.com/basemetas/fileview
- [Gitee] https://gitee.com/basemetas/fileview

## 启动容器

```bash
docker pull basemetas/fileview:latest

docker run -itd \
    --name fileview \
    -p 9000:80 \
    --restart=always \
    basemetas/fileview:latest
# 访问 http://ip:9000/
```

## 本地运行

```bash
# clone 代码，包含子仓库
git clone --recurse-submodules https://github.com/basemetas/fileview.git

# 使用容器启动服务端开发环境，需要先安装并启动 docker 服务
cd fileview-backend
docker compose up
docker exec -it fileview-backend /bin/bash

# 以上也可以在 IDE 中启动开发环境，如 vscode
# vscode 中打开服务端项目根目录，点击左下角“在容器中重新打开”

# 进入容器，启动预览服务和转换服务
cd /var/app/fileview-backend
chmod +x ./*.sh
./start-preview.sh
./start-convert.sh

# 安装并启动前端开发环境，需要先安装 nodejs LTS 版本，如 nodejs v24+
cd fileview-frontend
npm i
npm run dev

```

## 问题反馈与建议

在提 issue 前请确保满足以下条件：

- 必须是一个 bug 或者功能新增。
- 已经在 issue 中搜索过，并且没有找到相似的 issue 或者解决方案。

> 强烈推荐阅读 [《如何向开源社区提问题》](https://github.com/seajs/seajs/issues/545) 和 [《如何有效地报告 Bug》](http://www.chiark.greenend.org.uk/%7Esgtatham/bugs-cn.html)、[《如何向开源项目提交无法解答的问题》](https://zhuanlan.zhihu.com/p/25795393)，更好的问题更容易获得帮助。

## 贡献指南
我们非常欢迎社区开发者为 BaseMetas Fileview 贡献代码，在贡献之前请先阅读[贡献指南](./CONTRIBUTING.md)。

如果你想为 BaseMetas Fileview 实现一个重要功能，需要先按照模板撰写 RFC 文档，按照 BaseMetas Fileview 的[RFC 机制](./rfcs.md) 进行操作，在经过社区讨论完善后才可以进行代码的提交。

特别欢迎以下方向的贡献：

#### 🚀 文件格式支持
- 新 CAD 、3D 格式
- 新文档格式解析器
- PPT 播放、EXCEL 图表
#### ⚡ 性能优化
- 转换引擎、缓存策略、异步队列等优化
#### 🔌 存储与业务系统适配
- OSS、S3、MinIO
- 企业网盘集成插件等
- 业务集成场景适配优化
#### 📚 社区推广
- 使用教程、案例、最佳实践等文章
- 各大开源软件周刊/自媒体/公众号等推荐
- 您自己的一个 star ⭐️

## 用户交流

您可以使用 [Discussions](https://github.com/basemetas/fileview/discussions) 功能发起交流

## 社区资源

- [DzzOffice 文件预览插件](https://www.dzzoffice.com/index.php?mod=dzzmarket&op=view&mid=80) by [my1127angel](https://github.com/my1127angel)
- [可道云文件预览插件](https://gitee.com/xh2002/kod-plugins/tree/xiaohu/kodbox-plugins/bmFileView) by [xh2002](https://gitee.com/xh2002)


<!-- AGGREGATED_CONTRIBUTORS_START -->
## 所有贡献者

| 头像 | 用户 | 贡献次数 |
| :---: | :--- | :---: |
| <img src="https://avatars.githubusercontent.com/u/1859150?v=4" width="50" height="50"> | [pangnate](https://github.com/pangnate) | 172 |
| <img src="https://avatars.githubusercontent.com/u/104605365?v=4" width="50" height="50"> | [njxyf007](https://github.com/njxyf007) | 52 |

<!-- AGGREGATED_CONTRIBUTORS_END -->