# 字体安装

为了合规，文件预览服务默认仅集成了免费的中文思源字体及部分英文字体，不包含其它商用需要授权的字体。所以在部分文档预览时会发现与原文档字体不一致。

为了解决此问题，你可以自行安装通过正常渠道获取的其它字体

## 一、 挂载自定义字体

将容器的 `/usr/local/share/fonts` 目录挂载到宿主机，将需要的字体放进宿主机目录，启动容器即可生效

## 二、 启动预览服务

```bash
docker run -itd \    
    --name fileview \  
    -p 9000:80 \  
    --restart=always \  
    -v your/fonts/path:/usr/local/share/fonts \ 
    basemetas/fileview:latest
```
