# 防截图水印

防截图水印是临时覆盖在文档上的水印（非文档内部的水印），主要是为了对截图等场景做留痕，不会存入文档内部，下载、打印时不存在。

防截图水印目前支持以下场景
- word/cell/slide/pdf 的 `desktop` 模式
- word/cell/slide/pdf 的 `mobile` 模式
- word/cell/slide/pdf 的 `embedded` 模式
- slide 的播放模式

## 使用方法

对防截图水印的配置位于 `editorConfig.customization` 对象内

```json
{
  "customization": {
    "waterMark": {
      // 文字内容，支持使用 \\n 换行，建议不超过2行
      "value": "张三丰(190465)\\n192.168.80.163", 
      // 水印颜色，支持 rgba 和 hax 颜色（如：#ff0000）
      "fillstyle": "rgba( 192, 192, 192, 0.6 )",
      // 字号和字体
      "font": "20px Arial",
      // 旋转角度，支持正负 120° 以内 
      "rotate": -30, 
      // 水平间隔
      "horizontal": 30, 
      // 垂直间隔
      "vertical": 30, 
      // 整体透明度，0-1 之间的数字。默认为1，全不透明
      "opacity": 0.4 
    }
  }
}
```

![word](/images/watermark1.png)

![excel](/images/watermark2.png)
