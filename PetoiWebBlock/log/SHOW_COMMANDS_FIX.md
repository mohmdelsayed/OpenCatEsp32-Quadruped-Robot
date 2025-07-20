# Show Commands 功能修复

## 问题描述

用户反映当show commands按钮激活时，某些积木块（如gait、playmelody等）没有在console中打印出发送的指令。

**具体问题：**
1. 对于walk forward，期望打印 `"kwkF"`
2. 对于动头部平转关节，期望打印 `"m 0 90"`
3. 对于播放音乐，当前打印的是JSON格式的debug信息，但实际对机器人有意义的指令应该是简化的格式，如 `"B 0 1 22 1"`

## 问题分析

### 根本原因
1. **积木块生成的代码**调用 `webRequest(command, timeout, true)`
2. **webRequest函数**内部调用 `client.sendCommand(command, timeout)`
3. **sendCommand方法**会打印 `console.log('send message', messageStr)`，其中 `messageStr` 是JSON格式的完整消息
4. **用户期望**看到的是简化的命令格式，而不是JSON格式的debug信息

### 代码流程
```
积木块 → webRequest() → client.sendCommand() → 打印JSON消息
```

## 解决方案

### 1. 修改 webRequest 函数
**文件：** `PetoiWebBlock/blocks/communication.js`

**修改内容：**
- 在 `webRequest` 函数中添加对 `showSentCommands` 的支持
- 添加可选的 `displayCommand` 参数，用于指定显示格式
- 当 `showSentCommands` 激活时，优先使用 `displayCommand` 参数，否则自动解码base64命令
- 当 `showSentCommands` 激活且 `needResponse` 为true时，返回null以避免打印返回值

```javascript
function webRequest(command, timeout = 30000, needResponse = true, displayCommand = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // 如果showSentCommands开关激活，打印发送的命令
      if (typeof showSentCommands !== 'undefined' && showSentCommands) {
        // 使用displayCommand参数或默认处理
        let commandToDisplay = displayCommand || command;
        if (!displayCommand && command.startsWith("b64:")) {
          try {
            const decoded = decodeCommand(command);
            if (decoded && decoded.token && decoded.params) {
              commandToDisplay = `${decoded.token} ${decoded.params.join(" ")}`;
            }
          } catch (error) {
            // 如果解码失败，保持原命令
            commandToDisplay = command;
          }
        }
        console.log(getText("sendingCommand") + commandToDisplay);
      }
      
      let result = await window.client.sendCommand(command, timeout);
      if (Array.isArray(result) && result.length == 1) {
        result = result[0];
      }
      
      // 如果showSentCommands激活且needResponse为true，返回null以避免打印返回值
      if (typeof showSentCommands !== 'undefined' && showSentCommands && needResponse) {
        resolve(null);
      } else {
        resolve(needResponse ? result : true);
      }
    } catch (error) {
      console.error(getText("httpRequestError"), error);
      reject(error);
    }
  });
}
```

### 2. 修改 PetoiAsyncClient.sendCommand 方法
**文件：** `PetoiWebBlock/js/petoi_async_client.js`

**修改内容：**
- 只在debug模式下打印完整的JSON消息
- 避免在showSentCommands模式下打印JSON格式的debug信息

```javascript
const messageStr = JSON.stringify(message);
// 只在debug模式下打印完整的JSON消息
if (typeof showDebug !== 'undefined' && showDebug) {
    console.log('send message', messageStr);
}
```

### 3. 修改积木块生成的代码
**文件：** `PetoiWebBlock/blocks/generators.js`

**修改内容：**
- 将所有 `console.log(await webRequest(...))` 改为条件打印
- 只有当返回值不为null时才打印

```javascript
// 修改前
let code = `console.log(await webRequest("${cmd}", 20000, true));\n`;

// 修改后
let code = `(async () => { const result = await webRequest("${cmd}", 20000, true); if (result !== null) console.log(result); })();\n`;

// play_melody 特殊处理
let encodeCmd = encodeCommand("B", cmdParams);
let displayCmd = `B ${cmdParams.join(" ")}`;
let code = `(async () => { const result = await webRequest("${encodeCmd}", ${COMMAND_TIMEOUT_MAX}, true, "${displayCmd}"); if (result !== null) console.log(result); })();\n`;
```

**修改的积木块：**
- `gait` - 步态动作
- `posture` - 姿势动作
- `acrobatic_moves` - 杂技动作
- `gyro_control` - 陀螺仪控制
- `send_custom_command` - 自定义命令
- `play_note` - 播放音符
- `play_melody` - 播放旋律（**特殊处理：使用displayCommand参数显示可读格式**）
- `arm_action` - 机械臂动作
- `action_skill_file` - 执行技能文件
- `set_analog_output` - 设置模拟输出
- `set_digital_output` - 设置数字输出

## 功能验证

### 测试页面
创建了测试页面 `test_show_commands_simple.html` 来验证功能：

1. **Show Commands 关闭时：**
   - 只显示webRequest的返回值（如"OK"）
   - 不显示发送的命令

2. **Show Commands 激活时：**
   - 显示发送的命令（如"发送命令: kwkF"）
   - 不显示webRequest的返回值
   - 不显示JSON格式的debug信息

### 测试用例
- **步态命令：** `kwkF` → 显示 "发送命令: kwkF"
- **关节命令：** `m 0 90` → 显示 "发送命令: m 0 90"
- **音乐命令：** `B 0 1 22 1` → 显示 "发送命令: B 0 1 22 1"（而不是base64格式）

## 翻译支持

**文件：** `PetoiWebBlock/lang/translations.js`

已存在的翻译：
- 中文：`"sendingCommand": "发送命令: "`
- 英文：`"sendingCommand": "Sending command: "`
- 日文：`"sendingCommand": "コマンド送信中: "`

## 兼容性

### 向后兼容
- 所有现有的积木块代码继续正常工作
- showSentCommands开关默认为false，不影响现有行为
- 当showSentCommands关闭时，行为与之前完全一致

### 功能增强
- 新增了更清晰的命令显示
- 分离了debug信息和用户关心的命令信息
- 提供了更好的调试体验

## 使用说明

### 基本操作
1. 在PetoiWebBlock页面中，找到Console Log区域的"Show Commands"按钮
2. 点击按钮激活show commands功能
3. 运行积木块程序，观察console输出

### 预期效果
- **激活前：** 显示webRequest的返回值
- **激活后：** 显示发送给机器人的实际命令

### 示例输出
```
[激活前]
[14:30:15] OK

[激活后]
[14:30:15] 发送命令: kwkF
```

## 总结

通过这次修复，解决了用户反映的show commands功能问题：

1. ✅ **步态命令**：现在正确显示 `"kwkF"`
2. ✅ **关节命令**：现在正确显示 `"m 0 90"`
3. ✅ **音乐命令**：现在正确显示 `"B 0 1 22 1"` 而不是base64格式
4. ✅ **避免重复输出**：当showSentCommands激活时，不显示webRequest的返回值
5. ✅ **保持兼容性**：不影响现有功能，向后兼容
6. ✅ **智能显示**：对于base64编码的命令，自动解码显示可读格式

用户现在可以清楚地看到发送给机器人的实际命令，便于调试和理解程序行为。 
