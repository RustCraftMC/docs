import { defineConfig } from 'vitepress'

const githubLink = {
  icon: 'github' as const,
  link: 'https://github.com/RustCraftMC/RustCraft'
}

const englishSidebar = [
  {
    text: 'Getting Started',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/' },
      { text: '1. Mod Structure', link: '/lua-modding-api#mod-structure' },
      { text: '2. Permissions', link: '/lua-modding-api#permissions' },
      { text: '3. Lifecycle & Hot Reload', link: '/lua-modding-api#lifecycle-hot-reload' },
      { text: '4. Mod Configuration', link: '/lua-modding-api#mod-configuration' },
      { text: '5. Event System', link: '/lua-modding-api#event-system' }
    ]
  },
  {
    text: 'Client APIs',
    collapsed: false,
    items: [
      { text: '6. Client', link: '/lua-modding-api#client-api' },
      { text: '7. Player', link: '/lua-modding-api#player-api' },
      { text: '8. Input', link: '/lua-modding-api#input-api' },
      { text: '9. UI', link: '/lua-modding-api#ui-api' },
      { text: '10. World', link: '/lua-modding-api#world-api' }
    ]
  },
  {
    text: 'Network & Protocol',
    collapsed: false,
    items: [
      { text: '11. Network', link: '/lua-modding-api#network-api' },
      { text: '12. Protocol Translators', link: '/lua-modding-api#protocol-translators' }
    ]
  },
  {
    text: 'Rendering & Animation',
    collapsed: false,
    items: [
      { text: '13. First-Person Animation', link: '/lua-modding-api#first-person-animation' },
      { text: '14. HUD Drawing', link: '/lua-modding-api#hud-drawing' },
      { text: '15. Render Events', link: '/lua-modding-api#render-events' },
      { text: '16. Resources', link: '/lua-modding-api#resources-api' }
    ]
  },
  {
    text: 'Data & Diagnostics',
    collapsed: false,
    items: [
      { text: '17. Storage', link: '/lua-modding-api#storage-api' },
      { text: '18. Logging', link: '/lua-modding-api#logging' },
      { text: '19. Lifecycle Events', link: '/lua-modding-api#lifecycle-events' }
    ]
  },
  {
    text: 'Reference',
    collapsed: false,
    items: [
      { text: '20. Event Reference', link: '/lua-modding-api#event-reference' },
      { text: '21. Safety & Limitations', link: '/lua-modding-api#safety-limitations' },
      { text: '22. Complete Mod', link: '/lua-modding-api#complete-example' },
      { text: 'Markdown Examples', link: '/markdown-examples' },
      { text: 'Runtime API Examples', link: '/api-examples' }
    ]
  }
]

const chineseSidebar = [
  {
    text: '快速入门',
    collapsed: false,
    items: [
      { text: '概览', link: '/zh-cn/' },
      { text: '1. 模组结构', link: '/zh-cn/lua-modding-api#mod-structure' },
      { text: '2. 权限', link: '/zh-cn/lua-modding-api#permissions' },
      { text: '3. 生命周期与热重载', link: '/zh-cn/lua-modding-api#lifecycle-hot-reload' },
      { text: '4. 模组配置', link: '/zh-cn/lua-modding-api#mod-configuration' },
      { text: '5. 事件系统', link: '/zh-cn/lua-modding-api#event-system' }
    ]
  },
  {
    text: '客户端 API',
    collapsed: false,
    items: [
      { text: '6. 客户端', link: '/zh-cn/lua-modding-api#client-api' },
      { text: '7. 玩家', link: '/zh-cn/lua-modding-api#player-api' },
      { text: '8. 输入', link: '/zh-cn/lua-modding-api#input-api' },
      { text: '9. UI', link: '/zh-cn/lua-modding-api#ui-api' },
      { text: '10. 世界', link: '/zh-cn/lua-modding-api#world-api' }
    ]
  },
  {
    text: '网络与协议',
    collapsed: false,
    items: [
      { text: '11. 网络', link: '/zh-cn/lua-modding-api#network-api' },
      { text: '12. 协议转换器', link: '/zh-cn/lua-modding-api#protocol-translators' }
    ]
  },
  {
    text: '渲染与动画',
    collapsed: false,
    items: [
      { text: '13. 第一人称动画', link: '/zh-cn/lua-modding-api#first-person-animation' },
      { text: '14. HUD 绘制', link: '/zh-cn/lua-modding-api#hud-drawing' },
      { text: '15. 渲染事件', link: '/zh-cn/lua-modding-api#render-events' },
      { text: '16. 资源', link: '/zh-cn/lua-modding-api#resources-api' }
    ]
  },
  {
    text: '数据与诊断',
    collapsed: false,
    items: [
      { text: '17. 存储', link: '/zh-cn/lua-modding-api#storage-api' },
      { text: '18. 日志', link: '/zh-cn/lua-modding-api#logging' },
      { text: '19. 生命周期事件', link: '/zh-cn/lua-modding-api#lifecycle-events' }
    ]
  },
  {
    text: '参考',
    collapsed: false,
    items: [
      { text: '20. 完整事件参考', link: '/zh-cn/lua-modding-api#event-reference' },
      { text: '21. 安全性与限制', link: '/zh-cn/lua-modding-api#safety-limitations' },
      { text: '22. 完整模组示例', link: '/zh-cn/lua-modding-api#complete-example' }
    ]
  }
]

export default defineConfig({
  base: '/Docs/',
  lastUpdated: true,

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'RustCraft Lua Docs',
      description: 'Lua modding documentation for RustCraft.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Lua Modding API', link: '/lua-modding-api' },
          { text: 'Examples', link: '/markdown-examples' }
        ],
        sidebar: englishSidebar,
        search: { provider: 'local' },
        socialLinks: [githubLink],
        outline: { label: 'On this page', level: 'deep' },
        lastUpdatedText: 'Last updated',
        docFooter: { prev: 'Previous page', next: 'Next page' },
        langMenuLabel: 'Change language'
      }
    },

    'zh-cn': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-cn/',
      title: 'RustCraft Lua 文档',
      description: 'RustCraft Lua 模组开发文档。',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh-cn/' },
          { text: 'Lua 模组 API', link: '/zh-cn/lua-modding-api' }
        ],
        sidebar: chineseSidebar,
        search: {
          provider: 'local',
          options: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除查询条件',
                backButtonTitle: '关闭搜索',
                noResultsText: '无法找到相关结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '向上',
                  navigateDownKeyAriaLabel: '向下',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Escape'
                }
              }
            }
          }
        },
        socialLinks: [githubLink],
        outline: { label: '本页目录', level: 'deep' },
        lastUpdatedText: '最后更新于',
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到内容'
      }
    }
  }
})
