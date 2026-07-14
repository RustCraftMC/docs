# RustCraft Lua 模组 API

RustCraft 从 `mods/<mod_id>/manifest.json` 加载纯客户端 Lua 模组。每个模组都运行在独立的 Lua 5.4 状态中，仅开放 `TABLE`、`STRING`、`MATH`、`UTF8` 和 `COROUTINE` 标准库。

模组无法访问文件系统、操作系统、debug API、原生模块、`dofile` 或 `loadfile`。

---

## 1. 模组结构

```text
mods/
└── old_animations/
    ├── manifest.json          # 必需
    ├── scripts/
    │   └── client.lua         # 入口脚本，由 manifest 指定
    └── assets/
        └── old_animations/    # 模组命名空间资源根目录
            ├── textures/
            └── shaders/
```

### Manifest

```json
{
  "id": "example_mod",
  "name": "Example Mod",
  "version": "1.0.0",
  "api_version": 1,
  "entrypoints": {
    "client": "scripts/client.lua"
  },
  "permissions": [
    "client.read",
    "render.read",
    "render.custom_draw"
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一标识符，例如 `old_animations` |
| `name` | 面向用户显示的模组名称 |
| `version` | 语义化版本字符串 |
| `api_version` | 当前必须为 `1` |
| `entrypoints.client` | 相对于模组根目录的 Lua 入口脚本 |
| `permissions` | 模组申请的能力列表，参见下一节 |

---

## 2. 权限

模组必须在 `manifest.json` 中声明所需权限。普通权限会自动授予，以下敏感权限默认拒绝，必须由用户在 `mods/permissions.json` 中明确批准：

- `network.modify`：修改数据包字段
- `network.cancel`：取消或丢弃数据包
- `network.send`：主动发送新数据包
- `protocol.translate`：注册协议转换器
- `resources.register`：声明资源覆盖

### `mods/permissions.json`

```json
{
  "protocol_bridge": ["protocol.translate", "network.modify"],
  "network_tools": ["network.send", "network.cancel"]
}
```

### 完整权限表

| 权限 | 分类 | 敏感 | 能力 |
| --- | --- | --- | --- |
| `client.read` | 客户端 | 否 | 读取客户端快照、窗口和设置 |
| `client.modify` | 客户端 | 否 | 修改 FOV、视角晃动、HUD、相机、全屏和标题 |
| `ui.read` | UI | 否 | 读取 UI 快照 |
| `ui.modify` | UI | 否 | 显示消息、打开或关闭聊天、切换 HUD |
| `input.observe` | 输入 | 否 | 读取输入并接收 `input.action` 事件 |
| `input.consume` | 输入 | 否 | 消费输入边沿，阻止游戏继续处理 |
| `render.read` | 渲染 | 否 | 订阅渲染事件 |
| `render.modify` | 渲染 | 否 | 接收可修改的渲染上下文 |
| `render.custom_draw` | 渲染 | 否 | 使用 `event.draw:*()` |
| `animation.read` | 动画 | 否 | 读取动画上下文 |
| `animation.modify` | 动画 | 否 | 使用 `event.transform:*()` |
| `resources.read` | 资源 | 否 | 读取模组和资源提供者内容 |
| `resources.register` | 资源 | 是 | 注册资源覆盖 |
| `network.observe` | 网络 | 否 | 监听并读取结构化数据包 |
| `network.modify` | 网络 | 是 | 修改或替换数据包 |
| `network.cancel` | 网络 | 是 | 取消数据包 |
| `network.send` | 网络 | 是 | 通过 `game.network.send()` 发送数据包 |
| `protocol.inspect` | 协议 | 否 | 读取协议版本信息 |
| `protocol.translate` | 协议 | 是 | 注册 Lua 协议转换器 |
| `storage.read` | 存储 | 否 | 读取持久化键值数据 |
| `storage.write` | 存储 | 否 | 写入持久化键值数据 |

---

## 3. 生命周期与热重载

```lua
function on_load()
    game.log.info("Mod loaded successfully")
end

function on_unload()
    game.log.info("Mod shutting down")
end
```

- 入口脚本执行完成后调用 `on_load()`。
- Lua 状态因重载或关闭而销毁前调用 `on_unload()`。
- `/mods reload`：重载全部模组。
- `/mods reload <mod_id>`：重载指定模组。

重载会创建全新的 Lua 状态。原有监听器、排队数据包、UI 命令和协议转换器注册都会被清除。连接服务器期间不能重载协议转换器模组。

---

## 4. 模组配置

模组通过 `game.config.define()` 声明设置，值保存在 `mods/<mod_id>/config.json`。

```lua
local config = game.config.define({
    {
        key = "enabled",
        type = "boolean",
        label = "Enabled",
        description = "Enable mod functionality",
        default = true
    },
    {
        key = "strength",
        type = "number",
        label = "Strength",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.1
    },
    {
        key = "style",
        type = "choice",
        label = "Style",
        default = "classic",
        options = {
            { value = "classic", label = "Classic" },
            { value = "subtle", label = "Subtle" }
        }
    }
})

local enabled = config.get("enabled")
local strength = config.get("strength")
```

| 类型 | 参数 | Lua 返回类型 |
| --- | --- | --- |
| `boolean` | `default` | `boolean` |
| `number` | `default`、`min`、`max`、`step` | `number` |
| `choice` | `default`、`options` | `string` |

`define()` 可以重复调用，不会覆盖已经存在的配置。写入值会经过校验，无效值会回退到默认值。用户可以在游戏内 Modding 页面修改这些设置。

---

## 5. 事件系统

```lua
game.events.on("client.tick", function(event)
    local tick = event.tick
end)

game.events.on("animation.first_person.transform", {
    priority = 500,
    callback = function(event)
        -- 数字越大，执行越早
    end
})

local handle = game.events.on("event.name", callback)
handle:remove()
```

事件对象支持：

```lua
event:cancel()        -- 标记为取消
event:consume()       -- 消费事件，不再继续处理
event:set_result(v)   -- 设置返回值
```

优先级范围为 -10000 到 10000，按从高到低执行：`HIGHEST=1000`、`HIGH=500`、`NORMAL=0`、`LOW=-500`、`LOWEST=-1000`。

单个回调出错不会中止其他模组。一个模组连续出错三次后会在当前会话中被禁用，需要执行 `/mods reload` 恢复。

---

## 6. 客户端 API：`game.client`

读取函数需要 `client.read`，修改函数需要 `client.modify`。两组函数独立安装。

### 读取

```lua
local snap = game.client.snapshot()
-- { tick, frame_delta_seconds, fps, active_screen, paused,
--   window, settings, connection, player_present }

local win = game.client.window()
-- { width, height, framebuffer_width, framebuffer_height,
--   scale_factor, focused, fullscreen }

local settings = game.client.settings()
-- { fov_degrees, gui_scale, view_bobbing, hud_visible, camera_mode }

local conn = game.client.connection()
-- { state, connected, server_address, protocol_version,
--   protocol_name, latency_ms, encrypted, server_brand }

if game.client.is_connected() then
    -- 已连接
end
```

连接状态：`disconnected`、`connecting`、`login`、`play`。

常用页面 ID：`main_menu`、`game`、`pause`、`inventory`、`chat`、`sign_editor`、`disconnected`、`connecting`、`options`、`video_settings`、`controls`、`skin_customization`、`language`、`audio_settings`、`resource_packs`、`modding`、`mod_config`、`multiplayer`、`direct_connect`、`server_editor`、`alt_manager`、`loading_world`。

### 修改

```lua
game.client.set_fov_override(90.0)          -- 30.0 到 110.0
game.client.set_fov_override(nil)           -- 清除覆盖
game.client.set_view_bobbing_override(true)
game.client.set_hud_visibility_override(false)
game.client.set_camera_mode_override("third_person_back")
-- first_person | third_person_back | third_person_front
game.client.set_camera_mode_override(nil)
game.client.set_fullscreen(true)
game.client.set_window_title("RustCraft - Custom")
game.client.set_window_title(nil)
```

多个模组同时覆盖同一项设置时，加载顺序中最后一个已启用模组生效。

---

## 7. 玩家 API：`game.player`

需要 `client.read`。

```lua
if game.player.exists() then
    local player = game.player.snapshot()
end

local pos = game.player.position()
local vel = game.player.velocity()
local rot = game.player.rotation()
local mov = game.player.movement()
local act = game.player.action()
local cap = game.player.capabilities()
local vit = game.player.vitals()
```

`snapshot()` 在玩家不存在时返回 `nil`，包含：

- 实体 ID、名称、游戏模式和维度。
- 当前与上一帧位置、速度、yaw、pitch、body yaw、head yaw。
- 落地、碰撞、潜行、疾跑、跳跃、水/熔岩状态和移动输入。
- 使用物品、格挡、挥手及挥手进度。
- 创造、飞行、无敌、行走速度和飞行速度能力。
- 生命、吸收、饥饿、饱和度、氧气和经验。
- 当前快捷栏槽位。

`use_action`：`block`、`drink`、`bow`、`eat`、`use`。
`gamemode_name`：`survival`、`creative`、`adventure`、`spectator`。

---

## 8. 输入 API：`game.input`

读取需要 `input.observe`，消费输入需要 `input.consume`。

```lua
local held = game.input.held("attack")
local pressed = game.input.pressed("jump")
local released = game.input.released("jump")
local dx, dy = game.input.mouse_delta()
local captured = game.input.cursor_captured()

local consumed = game.input.consume("forward", "pressed")
```

动作名称：`forward`、`backward`、`strafe_left`、`strafe_right`、`jump`、`sneak`、`sprint`、`toggle_sprint`、`attack`、`use`、`inventory`、`drop_item`、`hotbar_1` 到 `hotbar_9`、`hotbar_next`、`hotbar_previous`、`chat`、`command`、`player_list`、`pause`、`toggle_flying`、`toggle_perspective`。

```lua
game.events.on("input.action", function(event)
    -- event.action
    -- event.edge = "pressed" | "released"
    -- event.held
    -- event.repeat
end)
```

---

## 9. UI API：`game.ui`

快照需要 `ui.read`，命令需要 `ui.modify`。

```lua
local ui = game.ui.snapshot()
-- screen、chat、inventory、gui、window

game.ui.show_system_message("Hello from Lua!")
game.ui.open_chat("/command")
game.ui.close_chat()
game.ui.set_hud_visible(false)
game.ui.set_crosshair_visible(false)
```

物品栏槽位格式为 `{ slot, id, count, damage, display_name }`。

---

## 10. 世界 API：`game.world`

需要 `client.read`。

```lua
local info = game.world.summary()
-- dimension_id、dimension_name、game_time、day_time、weather、
-- loaded_chunks、player_position

local block = game.world.block_at(x, y, z)
-- { state, sky_light, block_light, biome } 或 nil

local blocks = game.world.blocks_around(x, y, z, radius)
local entities = game.world.entities_around(x, y, z, radius)
```

- 批量方块查询半径最大为 8，最多返回 4096 项。
- 实体查询半径最大为 128，最多返回 128 项。
- 实体类型使用 snake_case，例如 `zombie`、`cave_spider`、`xp_orb`、`minecart_tnt`。

---

## 11. 网络 API：`game.network`

### 监听数据包

需要 `network.observe`。

```lua
game.events.on("network.packet.inbound", function(event)
    local packet = event.packet
    game.log.info(string.format("[%s] %s", packet.direction, packet.name))
end)

game.network.on_packet({
    direction = "inbound",
    names = { "clientbound_chat_message", "clientbound_disconnect" },
    priority = 500,
    callback = function(event)
        local packet = event.packet
    end
})
```

数据包对象：

```lua
{
    direction = "inbound" | "outbound",
    state = "handshake" | "status" | "login" | "play",
    version = 47,
    id = 0x02,
    name = "clientbound_chat_message",
    fields = { ... }
}
```

### 修改、取消和发送

```lua
-- 需要 network.modify
event.packet.fields.content = "modified text"
event:replace({
    name = "clientbound_system_chat",
    fields = { content = "replaced", overlay = false }
})

-- 需要 network.cancel
event:cancel()

-- 需要 network.send；每个模组每 tick 最多 20 个
game.network.send({
    name = "serverbound_chat_message",
    fields = { message = "Hello from Lua mod!" }
})
```

- v47 聊天消息最多 100 字节。
- Custom Payload 最多 32767 字节。
- 版本 codec 会拒绝未知字段。
- 修改和取消操作会进入开发审计记录。
- Lua 无法访问认证令牌、会话令牌、原始字节和加密数据。

连接事件：`network.state_changed` 提供 `previous`、`current`；`network.disconnect` 提供 `reason`。

---

## 12. 协议转换器：`game.protocol`

需要敏感权限 `protocol.translate`。

```lua
game.protocol.register_translator({
    id = "example:legacy_chat",
    source = 47,
    target = 107,

    inbound = function(packet, context)
        if packet.name == "clientbound_chat_message" then
            return {
                id = 0x0F,
                name = "clientbound_system_chat",
                fields = {
                    content = packet.fields.message,
                    overlay = false
                }
            }
        end
        return packet
    end,

    outbound = function(packet, context)
        return packet
    end
})
```

回调返回 `nil` 表示丢弃；返回一个数据包 table 表示替换；返回数据包序列表示拆分，最多 16 个。整条转换链最多产生 64 个数据包，字段序列化后的 JSON 最大 1 MiB。转换器 ID 必须带命名空间且不能重复，出站转换器按管线逆序执行。

---

## 13. 第一人称动画 API

```lua
game.events.on("animation.first_person.transform", function(event)
    -- event.hand = "main_hand" | "off_hand"
    -- event.state 包含 equip_progress、swing_progress、use_progress、
    -- attack_cooldown、using_item、blocking、sneaking、yaw、pitch、partial_tick

    if event.hand == "main_hand" and event.state.blocking then
        event.transform:translate(-0.08, 0.16, -0.12)
        event.transform:rotate_y(28)
        event.transform:rotate_x(-18)
        event.transform:rotate_z(-10)
    end
end)
```

事件：

- `animation.first_person.calculate`
- `animation.first_person.transform`
- `animation.first_person.arm_transform`
- `animation.first_person.item_transform`
- `animation.first_person.complete`

变换方法：

```lua
event.transform:reset()
event.transform:translate(x, y, z)
event.transform:rotate_x(degrees)
event.transform:rotate_y(degrees)
event.transform:rotate_z(degrees)
event.transform:rotate_axis(x, y, z, degrees)
event.transform:scale(sx, sy, sz)
event.transform:mul(matrix_table)
```

所有方法都前乘到已有 model 矩阵上。渲染管线为 `projection * view * model * position`。所有数值必须能表示为有限 f32，NaN 和 Infinity 会被拒绝，每个分量限制在 `[-1e6, 1e6]`。

---

## 14. HUD 绘制 API：`event.draw`

需要 `render.custom_draw`，仅在 `render.hud.before` 和 `render.hud.after` 中可用。绘制命令只在当前帧有效。

```lua
game.events.on("render.hud.after", function(event)
    event.draw:text({
        text = "Hello World",
        x = 8, y = 8, scale = 1.0,
        color = { r = 1, g = 1, b = 1, a = 1 }
    })

    event.draw:rect({
        x = 6, y = 24, width = 80, height = 12,
        color = { r = 0, g = 0, b = 0, a = 0.5 }
    })

    event.draw:line({
        x1 = 0, y1 = 0, x2 = 100, y2 = 100, width = 2,
        color = { r = 1, g = 0, b = 0, a = 1 }
    })

    event.draw:image({
        resource = "minecraft:textures/gui/widgets.png",
        x = 0, y = 0, width = 256, height = 256,
        u = 0, v = 0, uw = 1, vh = 1,
        color = { r = 1, g = 1, b = 1, a = 1 }
    })

    event.draw:push_transform()
    event.draw:translate(10, 10)
    event.draw:rotate(30)
    event.draw:scale(2, 2)
    event.draw:pop_transform()

    event.draw:set_scissor({ x = 0, y = 0, width = 200, height = 100 })
    event.draw:set_scissor(nil)
end)
```

- 每个模组每帧最多 4096 条绘制命令。
- 文本最多 4096 字节。
- 颜色分量必须为有限数值且位于 `[0, 10]`。
- 图片资源必须来自允许的内置 atlas：`widgets.png`、`icons.png` 或 `container/inventory.png`。

---

## 15. 渲染事件

| 事件 | 权限 | 时机 |
| --- | --- | --- |
| `render.frame.begin` | `render.read` | 帧开始 |
| `render.world.before` | `render.read` | 世界几何之前 |
| `render.world.after` | `render.read` | 世界几何之后 |
| `render.entities.before` | `render.read` | 实体之前 |
| `render.entities.after` | `render.read` | 实体之后 |
| `render.hand.before` | `render.read` | 第一人称手臂之前 |
| `render.hand.after` | `render.read` | 第一人称手臂之后 |
| `render.hud.before` | `render.read` | HUD 之前 |
| `render.hud.after` | `render.read` | HUD 之后 |
| `render.frame.end` | `render.read` | 帧结束 |

`render.hud.before/after` 在拥有 `render.custom_draw` 时提供 `event.draw`。`render.hand.transform` 提供用于修改手部网格的 `event.transform`。

---

## 16. 资源 API：`game.resources`

需要 `resources.read` 和/或 `resources.register`。

```lua
local text = game.resources.read_text("old_animations:textures/example.json")
local bytes = game.resources.read_binary("old_animations:sounds/click.ogg")
local path = game.resources.resolve("old_animations:textures/custom.png")
```

资源 ID 使用 `namespace:path`，namespace 为模组 ID。文件位于 `mods/<mod_id>/assets/<mod_id>/`。

- 二进制资源最大 1 MiB。
- 文本资源最大 256 KiB。
- 资源 ID 最大 256 字节。

---

## 17. 存储 API：`game.storage`

需要 `storage.read` 和/或 `storage.write`。数据保存在 `mods/<mod_id>/data/storage.json`，每次操作前都会重新读取，不使用过期内存快照。

```lua
local value = game.storage.read("my_key")
game.storage.write("my_key", { count = 42, name = "example" })
game.storage.delete("my_key")
local keys = game.storage.keys()
game.storage.clear()
```

| 限制 | 数值 |
| --- | --- |
| 文件总大小 | 512 KiB |
| 最大条目数 | 512 |
| key 最大长度 | 128 字节 |
| value 最大深度 | 16 |
| 单个 value 最大节点 | 4096 |
| 总节点数 | 16384 |
| 容器最大条目数 | 1024 |
| 字符串最大长度 | 64 KiB |

---

## 18. 日志：`game.log`

```lua
game.log.debug("Detailed debug information")
game.log.info("General information")
game.log.warn("Warning message")
game.log.error("Error occurred!")
```

输出格式：`[Lua/<LEVEL>/<mod_id>] message`。

---

## 19. 生命周期事件

`client.tick` 在进行游戏时每秒触发 20 次，需要 `client.read`。

```lua
game.events.on("client.tick", function(event)
    -- event.tick
    -- event.delta_time
    -- event.playing
end)
```

---

## 20. 完整事件参考

| 事件 | 数据 | 权限 |
| --- | --- | --- |
| `client.tick` | `tick`、`delta_time`、`playing` | `client.read` |
| `input.action` | `action`、`edge`、`held`、`repeat` | `input.observe` |
| `network.packet.inbound` | `event.packet` | `network.observe` |
| `network.packet.outbound` | `event.packet` | `network.observe` |
| `network.state_changed` | `previous`、`current` | `network.observe` |
| `network.disconnect` | `reason` | `network.observe` |
| `render.frame.begin` | `frame` | `render.read` |
| `render.world.before/after` | `frame` | `render.read` |
| `render.entities.before/after` | `frame` | `render.read` |
| `render.hand.before/after` | `frame` | `render.read` |
| `render.hud.before/after` | `frame`、`draw` | `render.read`，绘制另需 `render.custom_draw` |
| `render.frame.end` | `frame` | `render.read` |
| `render.entity.before/after` | `frame`、`entity` | `render.read` |
| `animation.first_person.calculate` | `hand`、`state` | `animation.read` |
| `animation.first_person.transform` | `hand`、`state`、`transform` | `animation.read/modify` |
| `animation.first_person.arm_transform` | `hand`、`state`、`transform` | `animation.read/modify` |
| `animation.first_person.item_transform` | `hand`、`state`、`transform` | `animation.read/modify` |
| `animation.first_person.complete` | `hand`、`state` | `animation.read` |

---

## 21. 安全性与限制

### Lua 可以做什么

- 读取客户端、玩家、世界和 UI 快照。
- 修改 FOV、相机模式、视角晃动、窗口标题和全屏状态。
- 绘制 HUD 文本、矩形、直线和图片。
- 修改第一人称手臂与物品变换。
- 按名称监听结构化数据包。
- 在明确授权后修改、取消、替换和发送数据包。
- 在明确授权后注册协议转换器。
- 读写模组范围内的持久化存储和资源。
- 输出不同级别的日志。

### Lua 不能做什么

- 访问 Vulkan handle、GPU buffer 或裸指针。
- 访问文件系统、操作系统或 debug API。
- 执行原生代码或加载动态库。
- 访问认证令牌和会话秘密。
- 修改玩家移动、位置或物品栏。
- 直接发送原始网络字节。
- 访问加密或压缩状态下的数据包。
- 绕过服务端反作弊。
- 伪造玩家身份或认证。

### 运行时限制

| 限制 | 默认值 |
| --- | --- |
| 每个模组内存 | 16 MiB |
| 每个回调指令数 | 250000 |
| 连续错误阈值 | 3 |
| 每帧绘制命令 | 4096 |
| 客户端命令队列 | 总计 1024，每模组 128 |
| 每 tick 主动发送数据包 | 每模组 20 |
| 每个转换阶段输出数据包 | 16 |
| 整条转换管线数据包 | 64 |

---

## 22. 完整模组示例

```lua
-- mods/example/scripts/client.lua

local config = game.config.define({
    { key = "enabled", type = "boolean", label = "Enabled", default = true },
    {
        key = "message",
        type = "choice",
        label = "Greeting",
        default = "hello",
        options = {
            { value = "hello", label = "Hello" },
            { value = "welcome", label = "Welcome" }
        }
    }
})

function on_load()
    game.log.info("Example mod loaded!")
end

function on_unload()
    game.log.info("Example mod shutting down...")
end

game.network.on_packet({
    direction = "inbound",
    names = { "clientbound_chat_message" },
    callback = function(event)
        local text = event.packet.fields.content or ""
        game.log.info(string.format("Chat: %s", text))
    end
})

game.events.on("render.hud.after", function(event)
    if config.get("enabled") then
        local msg = config.get("message") == "hello" and "Hello!" or "Welcome!"
        event.draw:text({
            text = msg,
            x = 8, y = 8,
            scale = 1.0,
            color = { r = 0.5, g = 1.0, b = 0.5, a = 0.85 }
        })
    end
end)

game.events.on("animation.first_person.transform", {
    priority = 500,
    callback = function(event)
        if not config.get("enabled") then return end
        if event.hand ~= "main_hand" then return end
        if not event.state.blocking then return end

        local swing = math.sin(math.sqrt(event.state.swing_progress) * math.pi)

        event.transform:translate(-0.08, 0.16, -0.12)
        event.transform:rotate_y(28)
        event.transform:rotate_x(-18)
        event.transform:rotate_z(-10)
        event.transform:translate(-0.12 * swing, 0.06 * swing, -0.08 * swing)
    end
})
```

---

英文原文见 [English API Reference](../lua-modding-api.md)。
