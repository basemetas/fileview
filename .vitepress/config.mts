import { defineConfig } from "vitepress";

function getBase() {
  // Cloudflare Pages 环境变量
  if (process.env.CF_PAGES) {
    return "/";
  }
  // GitHub Pages 环境变量
  if (process.env.GITHUB_PAGES) {
    return "/fileview/";
  }
  // 默认判断（通过 URL）
  if (typeof window !== "undefined") {
    return window.location.hostname.includes("github.io") ? "/fileview/" : "/";
  }
  return "/";
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: getBase(),
  cleanUrls: true,
  outDir: "./dist",
  srcExclude: ["**/README.md", "**/TODO.md"],
  lang: "zh-CN",
  title: "开源免费的在线文件预览解决方案，支持私有部署，即开即用 - BaseMetas 文件预览",
  description:
    "开源免费的在线文件预览解决方案。支持Office、PDF、图片、CAD、OFD、3D模型、代码文件等数百种格式。支持私有部署，即开即用",
  head: [
    [
      "script",
      {
        charset: "UTF-8",
        id: "LA_COLLECT",
        src: "//sdk.51.la/js-sdk-pro.min.js",
      },
    ],
    ["script", {}, `LA.init({id:"3OQXOeu7JLFmP27c",ck:"3OQXOeu7JLFmP27c"})`],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "",
    siteTitle: "BaseMetas 文件预览",
    search: {
      provider: "local",
      options: {},
    },

    nav: [
      { text: "首页", link: "/" },
      { text: "产品介绍", link: "/docs/product/summary" },
      { text: "支持格式", link: "/docs/product/formats" },
      { text: "安装部署", link: "/docs/install/docker" },
      { text: "服务集成", link: "/docs/feature/integration" },
      { text: "在线体验", link: "https://file.basemetas.cn", target: "_blank" },
    ],

    sidebar: {
      "/docs/": [
        {
          text: "产品介绍",
          collapsed: false,
          items: [
            { text: "产品介绍", link: "/docs/product/summary" },
            { text: "架构介绍", link: "/docs/product/architecture" },
            { text: "支持格式", link: "/docs/product/formats" },
            { text: "应用场景", link: "/docs/product/scenarios" },
            { text: "更新日志", link: "/docs/product/changelog" },
          ],
        },
        {
          text: "快速上手",
          collapsed: false,
          items: [
            { text: "安装部署", link: "/docs/install/docker" },
            { text: "服务集成", link: "/docs/feature/integration" },
            { text: "常见问题", link: "/docs/product/faq" },
          ],
        },
        {
          text: "进阶使用",
          collapsed: false,
          items: [
            { text: "字体安装", link: "/docs/feature/fonts" },
            { text: "文件密码", link: "/docs/product/password" },
            { text: "预览地址", link: "/docs/product/preview-url" },
            { text: "文件存储", link: "/docs/product/storage" },
            { text: "文件目录", link: "/docs/product/storage-dir" },
            { text: "长轮询机制", link: "/docs/product/polling" },
            { text: "缓存机制", link: "/docs/product/cache" },
            { text: "消息机制", link: "/docs/product/event" },
            { text: "全局转换引擎机制", link: "/docs/product/convert-engine" },
            { text: "CAD 转换器", link: "/docs/product/cad-converter" },
            { text: "OFD 转换器", link: "/docs/product/ofd-converter" },
            { text: "文档转换器", link: "/docs/product/libreoffice" },
            { text: "性能调优", link: "/docs/product/performance" },
            { text: "安全设置", link: "/docs/product/security" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/basemetas/fileview",
      },
    ],

    footer: {
      copyright: "Copyright © 2025 BaseMetas",
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      label: "页面导航",
      level: [2, 4],
    },

    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "short",
      },
    },
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
  },
  lastUpdated: true,
  ignoreDeadLinks: true,
  vite: {
    server: {
      port: 7890,
    },
  },
});
