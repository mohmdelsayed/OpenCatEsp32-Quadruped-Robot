# Debug Switch 功能说明

## 概述

在PetoiWebBlock的console中添加了一个新的Debug开关，用于控制WebSocket通信相关的debug信息的显示。

## 功能特性

### 1. Debug开关按钮
- 位置：Console Log区域的按钮组中
- 样式：与其他开关按钮（Timestamp、Show Commands）保持一致
- 状态：默认关闭状态

### 2. 可控制的Debug信息类型
Debug开关可以控制以下类型的debug信息显示：

- **心跳相关**：
  - `[Heartbeat] Sending heartbeat (time since last: 1752945421340ms)`
  - `[Heartbeat] Received heartbeat response (latency: 99ms)`
  - `[Heartbeat] Stopping heartbeat detection`

- **消息处理**：
  - `handleMessage {"type":"heartbeat","timestamp":5810715}`
  - `message type heartbeat`
  - `message type response`

- **命令发送**：
  - `send message {"type":"command","taskId":"1752945421913","commands":["d"],"timestamp":1752945421913}`

- **程序状态**：
  - `Program ended, sending rest command...`

- **WebSocket连接**：
  - `[WebSocket] Connection established`
  - `[WebSocket] Connection closed`

### 3. 工作原理

1. **消息过滤**：通过正则表达式模式匹配来识别debug信息
2. **开关控制**：当debug开关关闭时，debug信息不会显示在console中，但仍会输出到浏览器控制台
3. **实时切换**：可以随时切换debug开关状态，立即生效

## 使用方法

### 基本操作
1. 打开PetoiWebBlock页面
2. 在Console Log区域找到"Debug"按钮
3. 点击按钮切换debug信息显示状态
   - 按钮高亮（蓝色）：显示debug信息
   - 按钮未高亮：隐藏debug信息

### 测试功能
可以使用测试页面 `test_debug_switch.html` 来验证debug开关功能：

1. 访问 `http://localhost:8080/test_debug_switch.html`
2. 点击"Test Debug Messages"按钮生成debug信息
3. 切换Debug开关观察信息显示/隐藏效果

## 技术实现

### 1. 界面修改
- 在HTML中添加了Debug按钮
- 添加了相应的CSS样式

### 2. JavaScript逻辑
- 添加了 `showDebug` 全局变量
- 实现了 `toggleShowDebug()` 函数
- 重写了 `console.log` 函数来过滤debug信息
- 实现了 `isDebugInfo()` 函数来识别debug信息

### 3. 翻译支持
- 添加了中英文翻译文本
- 支持国际化显示

## 代码结构

### 主要修改文件
1. `programblockly.html` - 主界面和逻辑
2. `lang/translations.js` - 翻译文本
3. `test_debug_switch.html` - 测试页面

### 关键函数
```javascript
// 切换debug开关
function toggleShowDebug() {
    showDebug = !showDebug;
    const btn = document.getElementById('showDebugBtn');
    if (showDebug) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

// 检查是否为debug信息
function isDebugInfo(message) {
    const debugPatterns = [
        /\[Heartbeat\]/,
        /handleMessage/,
        /message type/,
        /send message/,
        /Program ended/,
        /\[WebSocket\]/
    ];
    
    return debugPatterns.some(pattern => pattern.test(message));
}
```

## 注意事项

1. **性能影响**：debug开关关闭时，debug信息仍会输出到浏览器控制台，只是不在页面console中显示
2. **实时性**：开关状态切换是实时的，不会影响已显示的信息
3. **兼容性**：与现有的Timestamp和Show Commands开关完全兼容
4. **扩展性**：可以通过修改 `debugPatterns` 数组来添加新的debug信息模式

## 未来改进

1. **持久化**：可以将debug开关状态保存到localStorage
2. **更多过滤选项**：可以添加更细粒度的debug信息分类
3. **自定义模式**：允许用户自定义debug信息过滤模式 
