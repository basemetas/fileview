# 子目录部署

中国版支持子目录部署，比如你需要将 `documentserver` 部署在 `/myeditor` 路径下，开启也非常方便。

子目录部署需要你在前一层的代理服务器上配置转发规则，并携带关键头部信息

## 配置转发

以 nginx 配置为例

```bash

location /myeditor/ {
    proxy_pass http://127.0.0.1:9000/;

    # 代理头设置
    proxy_set_header X-Forwarded-Prefix /myeditor;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header X-Forwarded-Host $host;

    # Websocket 支持
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_http_version 1.1;

    # 超时设置
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 60s;

    # 缓冲和重定向
    proxy_buffering off;
    proxy_redirect off;

    # Cookie 路径处理 - 如果后端应用需要
    # proxy_cookie_path / /myeditor/;

    # 缓存头
    add_header X-Cache $upstream_cache_status;
    add_header Cache-Control no-cache;

    # SSL 相关
    proxy_ssl_server_name on;
    proxy_ssl_verify off;
}

```
