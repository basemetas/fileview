# 安装字体

自定义 documentserver 的字体有两种方案，一种是完全替换，另一种是在原版镜像基础上追加自己的字体

## 完整替换字体

将容器的 `/var/www/onlyoffice/documentserver/core-fonts/` 目录挂载到宿主机，将需要的字体放进宿主机目录，启动容器即可生效

```bash
docker run -itd \    
    --name ds-china \  
    # 其它配置项...  
    -v /host/path/to/myfonts:/var/www/onlyoffice/documentserver/core-fonts  \       
    # 其它配置项...
    moqisoft/documentserver:latest
```

> [!IMPORTANT]
> 此种方式可能会因为部分核心字体缺失，导致显示不正常，或文件导出失败。不建议使用。

![完整替换](/images/font1.png)




## 追加部分字体

将容器的 `/usr/share/fonts/truetype/custom` 目录挂载到宿主机，将需要的字体放进宿主机目录，启动容器即可生效

![追加部分字体](/images/font2.png)
