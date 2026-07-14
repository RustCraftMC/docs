# RustCraft Lua Modding API

RustCraft loads client-only Lua mods from `mods/<mod_id>/manifest.json`. Each mod receives an
isolated Lua 5.4 state (`TABLE | STRING | MATH | UTF8 | COROUTINE`). No filesystem, OS, debug,
native module, `dofile`, or `loadfile` access is available.

---

## 1. Mod Structure

```
mods/
└── old_animations/
    ├── manifest.json          # required
    ├── scripts/
    │   └── client.lua         # entrypoint (paths configured in manifest)
    └── assets/
        └── old_animations/    # mod-namespace asset root
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

| Field | Description |
|-------|-------------|
| `id` | Unique namespaced identifier (e.g. `old_animations`) |
| `name` | Human-readable display name |
| `version` | Semantic version string |
| `api_version` | Must match `1` |
| `entrypoints.client` | Path to main Lua script, relative to mod root |
| `permissions` | List of capability strings (see §12) |

---

## 2. Permissions

Mods declare requested permissions in `manifest.json`. Non-sensitive permissions are granted
automatically. The following are **denied by default** and require explicit approval in
`mods/permissions.json`:

- `network.modify` — modify packet fields
- `network.cancel` — cancel/drop packets
- `network.send` — send new packets
- `protocol.translate` — register protocol translators
- `resources.register` — declare resource registrations

### `mods/permissions.json`

```json
{
  "protocol_bridge": ["protocol.translate", "network.modify"],
  "network_tools": ["network.send", "network.cancel"]
}
```

### Full Permission List

| Permission | Category | Sensitive | Grants |
|------------|----------|-----------|--------|
| `client.read` | Client | No | Read client snapshot, window, settings |
| `client.modify` | Client | No | Set FOV/bobbing/HUD/camera/fullscreen/title |
| `ui.read` | UI | No | Read UI snapshot |
| `ui.modify` | UI | No | Show messages, open/close chat, toggle HUD |
| `input.observe` | Input | No | Read input snapshot, receive `input.action` events |
| `input.consume` | Input | No | Consume input edges via `game.input.consume()` |
| `render.read` | Render | No | Subscribe to render events |
| `render.modify` | Render | No | Receive mutable render context |
| `render.custom_draw` | Render | No | Call `event.draw:*()` methods |
| `animation.read` | Animation | No | Read animation context |
| `animation.modify` | Animation | No | Call `event.transform:*()` methods |
| `resources.read` | Resources | No | Read mod and provider resources |
| `resources.register` | Resources | **Yes** | Declare resource overrides |
| `network.observe` | Network | No | Subscribe to packet events, read packet fields |
| `network.modify` | Network | **Yes** | Modify packet fields, replace packets |
| `network.cancel` | Network | **Yes** | Cancel/drop packets |
| `network.send` | Network | **Yes** | Send new packets via `game.network.send()` |
| `protocol.inspect` | Protocol | No | Read protocol version information |
| `protocol.translate` | Protocol | **Yes** | Register Lua protocol translators |
| `storage.read` | Storage | No | Read persistent key-value data |
| `storage.write` | Storage | No | Write persistent key-value data |

---

## 3. Lifecycle & Hot Reload

```lua
function on_load()
    game.log.info("Mod loaded successfully")
end

function on_unload()
    game.log.info("Mod shutting down")
end
```

- `on_load()` — called after the entrypoint script executes
- `on_unload()` — called before state is destroyed (reload or shutdown)

### Reload commands (in-game chat):
- `/mods reload` — reload all mods
- `/mods reload <mod_id>` — reload one specific mod

Reload creates a fresh Lua state: all listeners, queued packets, UI commands, and translator
registrations are removed. Protocol translator mods cannot reload while connected to a server
(will error).

---

## 4. Mod Configuration

Mods declare settings with `game.config.define()`. Values are persisted to
`mods/<mod_id>/config.json`.

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
        description = "Effect intensity",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.1
    },
    {
        key = "style",
        type = "choice",
        label = "Style",
        description = "Visual style preset",
        default = "classic",
        options = {
            { value = "classic", label = "Classic" },
            { value = "subtle", label = "Subtle" }
        }
    }
})

-- Read current values (always returns live data)
local enabled = config.get("enabled")
local strength = config.get("strength")
```

| Type | Parameters | Lua value type |
|------|-----------|----------------|
| `boolean` | `default` | `boolean` |
| `number` | `default`, `min`, `max`, `step` | `number` |
| `choice` | `default`, `options` (array of `{value, label}`) | `string` |

- `define()` is idempotent — calling it again does not overwrite existing entries
- Values are validated on write; values that fail validation fall back to defaults
- The in-game Modding screen allows users to edit these values

---

## 5. Event System

```lua
-- Simple subscription (priority 0)
game.events.on("client.tick", function(event)
    local tick = event.tick
end)

-- Priority subscription
game.events.on("animation.first_person.transform", {
    priority = 500,
    callback = function(event)
        -- higher priority = executed first
    end
})

-- Remove a listener
local handle = game.events.on("event.name", callback)
handle:remove()
```

### Event object methods

```lua
function(event)
    event:cancel()        -- mark event as cancelled
    event:consume()       -- consume the event (no further processing)
    event:set_result(v)   -- set a return value
end
```

### Priorities

Priorities run highest-to-lowest (-10000 to 10000):

| Constant | Value | Use |
|----------|-------|-----|
| HIGHEST | 1000 | Must run before everything |
| HIGH | 500 | Override defaults |
| NORMAL | 0 | Typical handler |
| LOW | -500 | Fallback observer |
| LOWEST | -1000 | Last resort |

### Error isolation

- A single callback error does not abort other mods' callbacks
- Three consecutive errors per mod disables that mod for the session
- Recovery requires `/mods reload`

---

## 6. Client API (`game.client`)

Requires: `client.read` (read functions) or `client.modify` (modify functions). Each set is
installed independently.

### Read functions (`client.read`)

```lua
-- Full snapshot (table)
local snap = game.client.snapshot()
-- { tick, frame_delta_seconds, fps, active_screen, paused,
--   window, settings, connection, player_present }

-- Window info
local win = game.client.window()
-- { width, height, framebuffer_width, framebuffer_height,
--   scale_factor, focused, fullscreen }

-- Client settings (respects active script overrides)
local s = game.client.settings()
-- { fov_degrees, gui_scale, view_bobbing, hud_visible, camera_mode }

-- Connection status
local conn = game.client.connection()
-- { state, connected, server_address, protocol_version,
--   protocol_name, latency_ms, encrypted, server_brand }

-- Boolean checks
if game.client.is_connected() then ... end
```

State values: `"disconnected"`, `"connecting"`, `"login"`, `"play"`

Screen IDs: `"main_menu"`, `"game"`, `"pause"`, `"inventory"`, `"chat"`, `"sign_editor"`,
`"disconnected"`, `"connecting"`, `"options"`, `"video_settings"`, `"controls"`,
`"skin_customization"`, `"language"`, `"audio_settings"`, `"resource_packs"`, `"modding"`,
`"mod_config"`, `"multiplayer"`, `"direct_connect"`, `"server_editor"`, `"alt_manager"`,
`"loading_world"`

### Modify functions (`client.modify`)

```lua
-- FOV override (30.0 to 110.0, nil to reset)
game.client.set_fov_override(90.0)
game.client.set_fov_override(nil)

-- View bobbing override (nil to reset)
game.client.set_view_bobbing_override(true)

-- HUD visibility override (nil to reset)
game.client.set_hud_visibility_override(false)

-- Camera mode override
game.client.set_camera_mode_override("third_person_back")
-- Values: "first_person", "third_person_back", "third_person_front"
game.client.set_camera_mode_override(nil)

-- Fullscreen toggle
game.client.set_fullscreen(true)

-- Window title (max 256 chars, no control chars)
game.client.set_window_title("RustCraft - Custom")
game.client.set_window_title(nil)
```

All overrides are applied per-mod in load order; the last enabled mod wins for each setting.

---

## 7. Player API (`game.player`)

Requires: `client.read`

```lua
-- Check presence
if game.player.exists() then ... end

-- Full snapshot (nil when not in-game)
local p = game.player.snapshot()
-- {
--   entity_id, name, gamemode, gamemode_name, dimension,
--   position: { x, y, z },
--   previous_position: { x, y, z },
--   velocity: { x, y, z },
--   rotation: { yaw, pitch, body_yaw, head_yaw },
--   movement: { on_ground, collided_horizontally, sneaking, sprinting,
--               jumping, in_water, in_lava, fall_distance,
--               input_strafe, input_forward },
--   action: { using_item, use_action, use_ticks, blocking,
--             swinging, swing_progress },
--   capabilities: { invulnerable, creative_mode, allow_flying,
--                   flying, walk_speed, fly_speed },
--   vitals: { health, max_health, absorption, food, saturation, oxygen },
--   experience: { level, progress, total },
--   selected_hotbar_slot
-- }

-- Individual accessors (nil when player absent)
local pos = game.player.position()     -- { x, y, z }
local vel = game.player.velocity()     -- { x, y, z }
local rot = game.player.rotation()     -- { yaw, pitch, body_yaw, head_yaw }
local mov = game.player.movement()     -- { on_ground, ... }
local act = game.player.action()       -- { blocking, swing_progress, ... }
local cap = game.player.capabilities() -- { creative_mode, flying, ... }
local vit = game.player.vitals()       -- { health, food, ... }
```

`use_action` values: `"block"` (sword), `"drink"` (potion), `"bow"`, `"eat"` (food), `"use"` (other)
`gamemode_name` values: `"survival"`, `"creative"`, `"adventure"`, `"spectator"`

---

## 8. Input API (`game.input`)

Requires: `input.observe`

```lua
-- Check if an action is currently held
local held = game.input.held("attack")       -- boolean

-- Check per-edge state
local pressed = game.input.pressed("jump")   -- just pressed this tick
local released = game.input.released("jump") -- just released this tick

-- Mouse delta since last tick
local dx, dy = game.input.mouse_delta()

-- Cursor capture state
local captured = game.input.cursor_captured()
```

### Input consume (`input.consume`)

```lua
-- Consume an input edge, preventing the game from processing it
local consumed = game.input.consume("forward", "pressed")
```

### Action names

`forward`, `backward`, `strafe_left`, `strafe_right`, `jump`, `sneak`, `sprint`,
`toggle_sprint`, `attack`, `use`, `inventory`, `drop_item`, `hotbar_1`–`hotbar_9`,
`hotbar_next`, `hotbar_previous`, `chat`, `command`, `player_list`, `pause`,
`toggle_flying`, `toggle_perspective`

### `input.action` event

Fires when any action changes state:

```lua
game.events.on("input.action", function(event)
    -- event.action   = "attack"
    -- event.edge     = "pressed" | "released"
    -- event.held     = true | false
    -- event.repeat   = true | false
end)
```

Requires: `input.observe`

---

## 9. UI API (`game.ui`)

Requires: `ui.read` (snapshot) and/or `ui.modify` (commands).

### Snapshot (`ui.read`)

```lua
local ui = game.ui.snapshot()
-- {
--   screen:       { id, title, in_game, paused },
--   chat:         { open, input, visible_messages, unread_messages },
--   inventory:    { open, window_id, kind, title, slot_count,
--                   selected_hotbar_slot, cursor_item, slots },
--   gui:          { hud_visible, crosshair_visible, chat_visible,
--                   debug_visible, scale, focused_widget },
--   window:       { width, height, framebuffer_width, framebuffer_height,
--                   scale_factor, focused, fullscreen }
-- }

-- Inventory slot: { slot, id, count, damage, display_name }
```

### Commands (`ui.modify`)

```lua
-- Show a system message in chat
game.ui.show_system_message("Hello from Lua!")

-- Open/close chat
game.ui.open_chat("/command")     -- optional initial text
game.ui.close_chat()

-- Toggle HUD visibility
game.ui.set_hud_visible(false)

-- Toggle crosshair
game.ui.set_crosshair_visible(false)
```

---

## 10. World API (`game.world`)

Requires: `client.read`

```lua
-- Summary (dimension, time, weather, chunk count)
local info = game.world.summary()
-- { dimension_id, dimension_name, game_time, day_time,
--   weather: { raining, thundering, rain_strength, thunder_strength },
--   loaded_chunks, player_position }

-- Query block at position (returns nil if out of range)
local block = game.world.block_at(x, y, z)
-- { state, sky_light, block_light, biome } or nil

-- Batch block query (radius ≤ 8, max 4096 results)
local blocks = game.world.blocks_around(x, y, z, radius)
-- table of { x, y, z, state, sky_light, block_light, biome }

-- Entity query (radius ≤ 128, max 128 results)
local entities = game.world.entities_around(x, y, z, radius)
-- table of { id, kind, name, x, y, z, vx, vy, vz, yaw, pitch,
--            on_ground, health, max_health }
```

Entity kind names are snake_case, e.g. `"zombie"`, `"cave_spider"`, `"xp_orb"`, `"minecart_tnt"`.

---

## 11. Network API (`game.network`)

### Packet observation (`network.observe`)

```lua
-- Subscribe to all inbound/outbound packets
game.events.on("network.packet.inbound", function(event)
    local p = event.packet
    game.log.info(string.format("[%s] %s", p.direction, p.name))
end)

-- Filtered subscription
game.network.on_packet({
    direction = "inbound",   -- "inbound" | "outbound"
    names = { "clientbound_chat_message", "clientbound_disconnect" },
    priority = 500,
    callback = function(event)
        local p = event.packet
    end
})
```

### Packet object

```lua
{
    direction = "inbound" | "outbound",
    state     = "handshake" | "status" | "login" | "play",
    version   = 47,
    id        = 0x02,
    name      = "clientbound_chat_message",
    fields    = { ... }  -- decoded, version-specific object
}
```

### Modify packets (`network.modify`)

```lua
game.events.on("network.packet.inbound", function(event)
    -- Change a field
    event.packet.fields.content = "modified text"

    -- Replace entire packet
    event:replace({
        name = "clientbound_system_chat",
        fields = {
            content = "replaced",
            overlay = false
        }
    })
end)
```

### Cancel packets (`network.cancel`)

```lua
game.events.on("network.packet.outbound", function(event)
    event:cancel()  -- prevents the packet from being sent
end)
```

### Send packets (`network.send`)

```lua
-- Max 20 per mod per tick
game.network.send({
    name = "serverbound_chat_message",
    fields = {
        message = "Hello from Lua mod!"
    }
})
```

- v47 chat messages are limited to 100 bytes
- Custom payloads limited to 32,767 bytes
- Unknown fields are rejected by the version codec
- All modifications/cancellations are logged in a dev audit trail
- Auth/session tokens, raw bytes, and encrypted data are never exposed

### Connection events

```lua
game.events.on("network.state_changed", function(event)
    -- event.previous, event.current
end)

game.events.on("network.disconnect", function(event)
    -- event.reason
end)
```

---

## 12. Protocol Translators (`game.protocol`)

Requires: `protocol.translate` (sensitive — must be approved in `permissions.json`)

```lua
game.protocol.register_translator({
    id = "example:legacy_chat",   -- namespaced, unique per mod
    source = 47,                  -- source protocol version
    target = 107,                 -- target protocol version

    inbound = function(packet, context)
        -- context: { source_version, target_version }
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

### Return values from translator callbacks

| Return | Meaning |
|--------|---------|
| `nil` | Drop the packet |
| Single packet table | Replace with this packet |
| Sequence of packet tables | Split into multiple packets (max 16) |

- Total pipeline limit: 64 packets per translation chain
- Packet fields must serialize to ≤ 1 MiB JSON
- Translator IDs are namespaced (e.g. `"mod_id:translator_name"`), duplicates rejected
- Outbound translators run in reverse pipeline order

---

## 13. First-Person Animation API

### Events

```lua
game.events.on("animation.first_person.transform", function(event)
    -- event.hand    = "main_hand" | "off_hand"
    -- event.state   = { equip_progress, swing_progress, use_progress,
    --                    attack_cooldown, using_item, blocking, sneaking,
    --                    yaw, pitch, partial_tick }

    if event.hand == "main_hand" and event.state.blocking then
        event.transform:translate(-0.08, 0.16, -0.12)
        event.transform:rotate_y(28)
        event.transform:rotate_x(-18)
        event.transform:rotate_z(-10)
    end
end)
```

Additional events:
- `animation.first_person.calculate` — before transforms
- `animation.first_person.arm_transform` — arm-only transform
- `animation.first_person.item_transform` — item-only transform
- `animation.first_person.complete` — after all transforms

### Transform API

```lua
event.transform:reset()                    -- reset to identity
event.transform:translate(x, y, z)         -- pre-multiply translation
event.transform:rotate_x(degrees)          -- rotate around X axis
event.transform:rotate_y(degrees)          -- rotate around Y axis
event.transform:rotate_z(degrees)          -- rotate around Z axis
event.transform:rotate_axis(x, y, z, deg)  -- rotate around arbitrary axis
event.transform:scale(sx, sy, sz)          -- pre-multiply scale
event.transform:mul(matrix_table)          -- 4×4 manual matrix {11..14, 21..24, 31..34, 41..44}
```

### Transform semantics

All methods **pre-multiply** onto the existing model matrix. The rendering pipeline is:

```
projection * view * model * position
```

Lua transforms are applied to the **model** matrix in call order. For example:
```lua
event.transform:translate(1, 0, 0)   -- model' = translate * model
event.transform:rotate_y(45)         -- model'' = rotate * translate * model
```

### Transform validation

- All components must be finite f32 values
- NaN/Infinity values are rejected
- Each component is clamped to [-1e6, 1e6]

---

## 14. HUD Drawing API (`event.draw`)

Requires: `render.custom_draw`

Available in `render.hud.before` and `render.hud.after` events. Commands are frame-local and expire
after rendering.

```lua
game.events.on("render.hud.after", function(event)
    -- Text (max 4096 chars)
    event.draw:text({
        text = "Hello World",
        x = 8, y = 8,
        scale = 1.0,                       -- 0.1 to 16.0
        color = { r = 1.0, g = 1.0, b = 1.0, a = 1.0 }
    })

    -- Filled rectangle
    event.draw:rect({
        x = 6, y = 24,
        width = 80, height = 12,
        color = { r = 0, g = 0, b = 0, a = 0.5 }
    })

    -- Line
    event.draw:line({
        x1 = 0, y1 = 0, x2 = 100, y2 = 100,
        width = 2.0,                       -- 0.1 to 128.0
        color = { r = 1.0, g = 0, b = 0, a = 1.0 }
    })

    -- Image
    event.draw:image({
        resource = "minecraft:textures/gui/widgets.png",
        x = 0, y = 0,
        width = 256, height = 256,
        u = 0, v = 0, uw = 1.0, vh = 1.0,
        color = { r = 1.0, g = 1.0, b = 1.0, a = 1.0 }
    })

    -- Transform stack
    event.draw:push_transform()
    event.draw:translate(tx, ty)
    event.draw:rotate(degrees)
    event.draw:scale(sx, sy)
    event.draw:pop_transform()

    -- Scissor rectangle (nil to disable)
    event.draw:set_scissor({
        x = 0, y = 0,
        width = 200, height = 100
    })
    event.draw:set_scissor(nil)
end)
```

### Limits

- **4,096** draw commands per frame total (before + after combined per mod)
- Text max **4,096** bytes
- Color components must be finite and within [0, 10]
- Image resources validated against built-in atlas:
  `minecraft:textures/gui/widgets.png`
  `minecraft:textures/gui/icons.png`
  `minecraft:textures/gui/container/inventory.png`

---

## 15. Render Events

| Event | Permission | Description |
|-------|-----------|-------------|
| `render.frame.begin` | `render.read` | Frame rendering starts |
| `render.world.before` | `render.read` | Before world geometry |
| `render.world.after` | `render.read` | After world geometry |
| `render.entities.before` | `render.read` | Before entity rendering |
| `render.entities.after` | `render.read` | After entity rendering |
| `render.hand.before` | `render.read` | Before first-person hand |
| `render.hand.after` | `render.read` | After first-person hand |
| `render.hud.before` | `render.read` | Before HUD overlay |
| `render.hud.after` | `render.read` | After HUD overlay |
| `render.frame.end` | `render.read` | Frame rendering ends |

The `render.hud.before/after` events provide `event.draw` with `render.custom_draw` permission.

The `render.hand.transform` event provides `event.transform` for hand mesh modification.

---

## 16. Resources API (`game.resources`)

Requires: `resources.read` and/or `resources.register`

```lua
-- Read text resource from mod's assets folder
local text = game.resources.read_text("old_animations:textures/example.json")

-- Read binary resource
local bytes = game.resources.read_binary("old_animations:sounds/click.ogg")

-- Resolve a registered resource ID to its current target
local path = game.resources.resolve("old_animations:textures/custom.png")
```

Resource IDs follow `namespace:path` format. The namespace is the mod ID. Resources are read from
`mods/<mod_id>/assets/<mod_id>/` directory.

Limits:
- Binary: ≤ 1 MiB
- Text: ≤ 256 KiB
- Resource ID: ≤ 256 bytes

---

## 17. Storage API (`game.storage`)

Requires: `storage.read` and/or `storage.write`

Persistent key-value JSON storage scoped to `mods/<mod_id>/data/storage.json`. Data is read fresh
before every operation; no stale in-memory snapshots.

```lua
-- Read a value
local value = game.storage.read("my_key")

-- Write a value (supports tables, strings, numbers, booleans, nil)
game.storage.write("my_key", { count = 42, name = "example" })

-- Delete a key
game.storage.delete("my_key")

-- List all keys
local keys = game.storage.keys()

-- Clear all stored data
game.storage.clear()
```

### Limits

| Limit | Value |
|-------|-------|
| Total file size | 512 KiB |
| Max entries | 512 |
| Max key length | 128 bytes |
| Max value depth | 16 |
| Max value nodes | 4,096 |
| Total nodes | 16,384 |
| Max container entries | 1,024 |
| Max string length | 64 KiB |

---

## 18. Logging (`game.log`)

```lua
game.log.debug("Detailed debug information")
game.log.info("General information")
game.log.warn("Warning message")
game.log.error("Error occurred!")
```

Output format: `[Lua/<LEVEL>/<mod_id>] message`

---

## 19. Lifecycle Events

| Event | When | Permission |
|-------|------|------------|
| `client.tick` | Every game tick (20/s when playing) | `client.read` |

```lua
game.events.on("client.tick", function(event)
    -- event.tick, event.delta_time, event.playing
end)
```

---

## 20. Complete Event Reference

| Event | Data | Permission |
|-------|------|------------|
| `client.tick` | `{ tick, delta_time, playing }` | `client.read` |
| `input.action` | `{ action, edge, held, repeat }` | `input.observe` |
| `network.packet.inbound` | `event.packet` (table) | `network.observe` |
| `network.packet.outbound` | `event.packet` (table) | `network.observe` |
| `network.state_changed` | `{ previous, current }` | `network.observe` |
| `network.disconnect` | `{ reason }` | `network.observe` |
| `render.frame.begin` | `{ frame }` (context) | `render.read` |
| `render.world.before` | `{ frame }` | `render.read` |
| `render.world.after` | `{ frame }` | `render.read` |
| `render.entities.before` | `{ frame }` | `render.read` |
| `render.entities.after` | `{ frame }` | `render.read` |
| `render.hand.before` | `{ frame }` | `render.read` |
| `render.hand.after` | `{ frame }` | `render.read` |
| `render.hud.before` | `{ frame, draw }` | `render.read` (+ `custom_draw` for draw) |
| `render.hud.after` | `{ frame, draw }` | `render.read` (+ `custom_draw` for draw) |
| `render.frame.end` | `{ frame }` | `render.read` |
| `render.entity.before` | `{ frame, entity }` | `render.read` |
| `render.entity.after` | `{ frame, entity }` | `render.read` |
| `animation.first_person.calculate` | `{ hand, state }` | `animation.read` |
| `animation.first_person.transform` | `{ hand, state, transform }` | `animation.read/modify` |
| `animation.first_person.arm_transform` | `{ hand, state, transform }` | `animation.read/modify` |
| `animation.first_person.item_transform` | `{ hand, state, transform }` | `animation.read/modify` |
| `animation.first_person.complete` | `{ hand, state }` | `animation.read` |

---

## 21. Safety & Limitations

### What Lua CAN do

- Read client/player/world/UI snapshots
- Modify FOV, camera mode, view bobbing, window title, fullscreen state
- Draw HUD overlays (text, rect, line, image)
- Modify first-person arm/item transforms
- Observe structured packet data by name
- Modify, cancel, replace, and send packets (with explicit permission)
- Register protocol version translators (with explicit permission)
- Read/write scoped persistent storage
- Read mod-asset and registered resources
- Log debug/info/warn/error messages

### What Lua CANNOT do

- Access Vulkan handles, GPU buffers, or raw pointers
- Access filesystem, OS, or debug APIs
- Execute native code or load dynamic libraries
- Access authentication tokens or session secrets
- Modify player movement, position, or inventory
- Send raw bytes over the network
- Access encrypted/compressed packet data
- Bypass server anticheat checks
- Spoof player identity or forge authentication

### Runtime Limits

| Limit | Default |
|-------|---------|
| Memory per mod | 16 MiB |
| Instructions per callback | 250,000 |
| Consecutive error threshold | 3 |
| Max draw commands per frame | 4,096 |
| Max client commands queue | 1,024 total / 128 per mod |
| Max packets sent per tick | 20 per mod |
| Max translated packets per stage | 16 |
| Max pipeline packets | 64 |

---

## 22. Example: Complete Mod

```lua
-- mods/example/scripts/client.lua

local config = game.config.define({
    { key = "enabled", type = "boolean", label = "Enabled", default = true },
    { key = "message", type = "choice", label = "Greeting", default = "hello",
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

-- Observe chat packets
game.network.on_packet({
    direction = "inbound",
    names = { "clientbound_chat_message" },
    callback = function(event)
        local text = event.packet.fields.content or ""
        game.log.info(string.format("Chat: %s", text))
    end
})

-- Draw HUD indicator
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

-- Custom block animation
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

        event.transform:translate(
            -0.12 * swing,
             0.06 * swing,
            -0.08 * swing
        )
    end
})
```
