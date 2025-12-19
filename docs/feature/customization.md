# 个性化配置

对编辑器的个性化配置全部在 `editorConfig.customization` 对象内

> [!TIP]
> 部分功能为高级版功能，如有需要请联系交流群（183026419）管理员

## 自定义 logo

```json
{
  "customization": {
    "logo": {
      // 是否显示logo
      "visible": true,
      // embed模式
      "imageEmbedded": "https://imageurl",
      // 普通模式
      "image": "https://imageurl",
      // 链接地址
      "url": "https://siteurl"
    }
  }
}
```



## 自定义品牌

```json
{
  "customization": {
    "customer": {
      "address": "My City, 123a-45",
      "mail": "john@example.com",
      "logo": "https://example.com/logo-big.png",
      "name": "John Smith and Co.",
      "phone": "123456789",
      "www": "example.com"
    }
  }
}
```

## 隐藏左侧按钮

```json
{
  "customization": {
    // 左侧关于，true 显示 false 隐藏，下同
    "about": false,
    // 左侧反馈
    "feedback": false,
    // 顶部返回
    "goback": false,
    // 帮助菜单
    "help": false,
    // 底部状态栏拼写检查相关菜单
    "layout": {
      "statusBar": {
        "actionStatus": false,
        "docLang": false,
        "textLang": false
      }
    }
  }
}
```

## 自定义加载 logo 及标题

```json
{
  "customization": {
    // 加载logo，留空则不显示，仅支持 desktop 和 mobile 模式
    "loaderLogo": "https://imageurl",
    // 加载文字，留空则不显示
    "loaderName": "yourtext"
  }
}
```

## 自定义默认字体及大小

```json
{
  "customization": {
    "font": {
      // 默认字号
      "size": 12,
      // 默认字体
      "name": "SimSun"
    }
  }
}
```

## 关闭拼写检查

```json
{
  "customization": {
    "features": {
      "spellcheck": false
    }
  }
}
```

全部配置见 https://api.onlyoffice.com/docs/docs-api/usage-api/config/editor/customization/customization-standard-branding/
