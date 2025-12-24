# 安装部署

预览服务仅提供 docker 镜像文件，目前支持 AMD64 和 ARM64 架构。

## 拉取镜像

```bash
docker pull basemetas/fileview:latest
```

## 启动预览服务

```bash
docker run -itd \
    --name fileview \
    -p 9000:80 \
    --restart=always \
    basemetas/fileview:latest
```

## 访问系统

- 访问系统欢迎页 http://ip:9000/

![系统欢迎页](/public/images/install.png)

当你看到这个页面时，说明你使用的文件预览服务启动成功，可以与其它系统进行[服务集成](../feature/integration.md)了。

## 子目录部署

系统支持子目录部署，nginx 反向代理配置示例如下

```
server {
    listen 80;
    server_name yourPreviewServer;
    
    location /subpath/ {
        proxy_pass http://ip:9000/;

        # 代理头设置
        proxy_set_header X-Forwarded-Prefix /subpath;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-Host $host;

    }
}

```

此时预览服务欢迎页的访问路径则为 `http://yourPreviewServer/subpath/preview/welcome`
