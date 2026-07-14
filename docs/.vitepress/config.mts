import { defineConfig } from 'vitepress'

const githubLink = {
  icon: 'github' as const,
  link: 'https://github.com/RustCraftMC/RustCraft'
}

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
        sidebar: [
          {
            text: 'Lua Modding',
            items: [
              { text: 'Lua Modding API', link: '/lua-modding-api' }
            ]
          },
          {
            text: 'Examples',
            items: [
              { text: 'Markdown Examples', link: '/markdown-examples' },
              { text: 'Runtime API Examples', link: '/api-examples' }
            ]
          }
        ],
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
        sidebar: [
          {
            text: 'Lua 模组开发',
            items: [
              { text: 'Lua 模组 API', link: '/zh-cn/lua-modding-api' }
            ]
          }
        ],
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
