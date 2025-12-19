# 管理面板 <span class="ant-tag">9.1.01+支持</span>

社区版自 `9.1` 版本增加了管理面板（adminpanel）功能，可以通过图形化界面进行常用配置的修改，简化了配置文件的编辑工作。

中国版自 `9.1.01` 版本开始支持，并对其做了适度的优化，切换外部访问端口与 `DocService` 一致，方便使用。

## 使用方法

adminpanel 功能默认是关闭的，需要在容器中自行启动：

```bash
docker exec 容器名 sudo supervisorctl start ds:adminpanel
```

第一次启动会在容器日志中看到一条如下内容
```bash
AdminPanel SETUP REQUIRED | Bootstrap code: IK6HKVU0YMB3 | Expires: 2025-11-01T14:00:00.000Z | Open: http://host/admin
```

复制 `Bootstrap code`，然后通过浏览器访问 `http://服务器地址:端口/adminpanel` 进行初始化设置。


> [!TIP]  
> `端口` 是容器 `80` 端口绑定的宿主机端口，路径是 `/adminpanel`，与官方默认配置不同