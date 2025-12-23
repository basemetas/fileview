# 安装部署

预览服务仅提供 docker 镜像文件，目前支持 AMD64 和 ARM64 架构。

## 一、 拉取镜像

```bash
docker pull basemetas/fileview:latest
```

## 二、 启动预览服务

```bash
docker run -itd \    
    --name fileview \  
    -p 9000:80 \  
    --restart=always \  
    basemetas/fileview:latest
```

## 三、 访问系统

- 访问系统欢迎页 http://ip:9000/

![系统欢迎页](/public/images/install.png)

当你看到这个页面时，说明你使用的文件预览服务启动成功，可以与其它系统进行[服务集成](../feature/integration.md)了。

