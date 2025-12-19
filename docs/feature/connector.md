# 连接器与自动化 API
 
> [!TIP]
> 该功能为高级版功能，如有需要请联系交流群（183026419）管理员


Connector 是一个允许从外部源编辑文本文档、电子表格、演示文稿、PDF 和可填写表单的类。一般用于和自己的各类业务系统做集成，通过自动化 JSAPI 方式修改文档，能力较金山文档的 JSSDK 等强大很多。

[点击查看 WPS SDK 官方文档](https://solution.wps.cn/docs/client/api/summary.html)  
[点击查看 ONLYOFFICE 连接器官方文档](https://api.onlyoffice.com/docs/docs-api/usage-api/automation-api/)


连接器常见的业务场景如：
- 合同生成系统中，读取接口数据，将内容填写到合同模板对应位置，自动生成合同
- AI写作类系统，在外部调用AI能力做撰写、润色等，将内容插入到光标位置
- 报表系统，将统计数据通过 JSAPI 在 excel 中自动生成图表

要使用连接器，请使用文档编辑器对象的 createConnector 方法：

```js
const connector = docEditor.createConnector();
```

介绍文档见官方连接器章节 https://api.onlyoffice.com/docs/docs-api/usage-api/automation-api/    

连接器具有与插件相同的接口。可以在 [插件和宏页面](https://api.onlyoffice.com/docs/plugin-and-macros/customization/context-menu/) 找到大量可用的代码示例。

中国版完整实现了官方连接器的相同功能，兼容官方的 JSAPI，并逐步对其能力做增强，可以轻松实现外部对文档的各类操作。

![连接器](/images/connector.png)
