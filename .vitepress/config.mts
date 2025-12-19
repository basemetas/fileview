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
    return window.location.hostname.includes("github.io")
      ? "/fileview/"
      : "/";
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
  title: "文件预览",
  description: "文件预览，office专家。部署简单，即开即用",
  head: [
    ["meta", { name: "baidu-site-verification", content: "codeva-rt8FUjktiP" }],
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
    search: {
      provider: "local",
      options: {},
    },

    nav: [
      { text: "首页", link: "/" },
      { text: "产品介绍", link: "/docs/product/summary" },
      { text: "在线体验", link: "https://file.basemetas.cn", target: "_blank" },
    ],

    sidebar: {
      "/docs/": [
        {
          text: "快速上手",
          collapsed: false,
          items: [
            { text: "产品介绍", link: "/docs/product/summary" },
            { text: "安装部署", link: "/docs/install/docker" },
            { text: "更新日志", link: "/docs/product/changelog" },
            { text: "集成示例", link: "/docs/product/example" },
            { text: "常见问题", link: "/docs/product/faq" },
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
