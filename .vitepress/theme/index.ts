// .vitepress/theme/index.js
import DefaultTheme from "vitepress/theme";
import { onMounted, watch, nextTick } from "vue";
import { useRoute, inBrowser } from "vitepress";
import "./custom.css";
// import Layout from "./Layout.vue";
// import SiderAds from "./SiderAds.vue";
// import FeedsAds from "./FeedsAds.vue";

export default {
  ...DefaultTheme,
  // Layout,
  // enhanceApp({ app }) {
  //   // 注册全局组件
  //   app.component("SiderAds", SiderAds);
  //   app.component("FeedsAds", FeedsAds);
  // },
  setup() {
    const route = useRoute();
    const initZoom = async () => {
      if (inBrowser) {
        await import("medium-zoom").then((module) => {
          const mediumZoom = module.default;
          mediumZoom(".main img", { background: "var(--vp-c-bg)" });
        });
      }
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
};
