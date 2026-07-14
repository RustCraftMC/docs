# RustCraft Lua 模组文档

这里是 RustCraft 客户端 Lua 模组系统的官方文档。

RustCraft 使用隔离的 Lua 5.4 运行环境加载客户端模组。模组可以读取客户端状态、监听输入与网络事件、绘制 HUD、调整第一人称动画，并在获得相应权限后修改网络数据包或注册协议转换器。

## 选择语言 / Choose a language

{% content-ref url="zh-cn/lua-modding-api.md" %}
[lua-modding-api.md](zh-cn/lua-modding-api.md)
{% endcontent-ref %}

{% content-ref url="en/lua-modding-api.md" %}
[lua-modding-api.md](en/lua-modding-api.md)
{% endcontent-ref %}

## 版本信息 / Version

- Lua：5.4
- RustCraft Lua API：1
- Minecraft 协议：1.8.9 / v47

接口名称、权限字符串和事件名称在所有语言版本中保持一致。
