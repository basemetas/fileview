# 访问加速

onlyoffice 的业务流程导致部分性能问题，中国版通过优化资源加载逻辑，达到部分加速效果。

## 开启字体加速 <span class="ant-tag">9.0.4+支持</span>

原理是，将字体拆分为多个域名请求，从而绕过浏览器对单域名连接数限制实现并行加载，还可以单独做 cdn 加速，加快下载及渲染速度。

第一步：增加配置项

```js
editorConfig: {
    customization: {
        // 将字体拆分为多个域名请求
        resPrefix: ["https://yourdomain1.com", "https://yourdomain2.com"],
    },
}
```

第二步：将容器内 `fonts` 目录下的字体文件导出，分别部署到上述域名下，验证可以使用 `https://yourdomain1.com/fonts/000` 正常下载。

```bash
# 导出字体文件
docker cp 容器名:/var/www/onlyoffice/documentserver/fonts ./fonts
```

第三步：配置字体访问允许跨域，验证文档打开及编辑是否正常。

效果展示（三个域名同时在下载字体）

![效果展示](/images/domains.png)

![效果展示](/images/domains2.png)
