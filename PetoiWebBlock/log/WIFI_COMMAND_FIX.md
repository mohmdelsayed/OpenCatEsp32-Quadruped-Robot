# WiFi命令重复调用问题修复

## 问题描述

在PetoiWebBlock中，当用户点击"Quick Connect"按钮时，Console Log中会出现两次"Sent WiFi command to get IP address"消息：

```
[01:27:00.265] Sent WiFi command to get IP address
[01:27:00.265] Sent WiFi command to get IP address
```

## 问题原因

通过代码分析发现，问题出现在`quickConnect()`函数的逻辑中：

1. 当用户点击"Quick Connect"按钮时，会调用`quickConnect()`函数
2. 在`quickConnect()`函数中，首先检查串口是否已连接（`if (!port)`）
3. 如果串口未连接，会调用`openSerialPort()`函数
4. 在`openSerialPort()`函数中，串口连接成功后会自动调用`sendWifiCommand()`
5. 然后`quickConnect()`函数继续执行，又调用了一次`sendWifiCommand()`

这就导致了`sendWifiCommand()`被调用了两次，所以会打印两次"Sent WiFi command to get IP address"。

## 修复方案

修改`quickConnect()`函数的逻辑，避免重复调用`sendWifiCommand()`：

### 修复前的代码：
```javascript
async function quickConnect() {
  // 检查串口是否已连接
  if (!port) {
    // 如果串口未连接，先尝试连接串口
    await openSerialPort();
  }

  if (!writer) {
    return;
  }

  // 自动发送'w'指令获取IP地址
  await sendWifiCommand();
}
```

### 修复后的代码：
```javascript
async function quickConnect() {
  // 检查串口是否已连接
  if (!port) {
    // 如果串口未连接，先尝试连接串口
    // openSerialPort() 内部已经会调用 sendWifiCommand()，所以这里不需要重复调用
    await openSerialPort();
  }
  else if (writer) {
    // 如果串口已连接但需要重新获取IP地址，才调用 sendWifiCommand()
    await sendWifiCommand();
  }
}
```

## 修复逻辑

1. **串口未连接的情况**：
   - 调用`openSerialPort()`函数
   - `openSerialPort()`内部会自动调用`sendWifiCommand()`
   - 不再在`quickConnect()`中重复调用

2. **串口已连接的情况**：
   - 直接调用`sendWifiCommand()`获取IP地址
   - 这种情况通常用于重新获取IP地址

## 测试验证

可以使用测试页面 `test_wifi_command_fix.html` 来验证修复效果：

1. 访问 `http://localhost:8080/test_wifi_command_fix.html`
2. 点击"测试原始行为"可以看到重复调用的问题
3. 点击"测试修复后行为"可以看到修复后的效果

## 影响范围

这个修复只影响"Quick Connect"功能，不会影响其他功能：

- ✅ 修复了重复调用的问题
- ✅ 保持了原有的功能逻辑
- ✅ 不影响串口连接功能
- ✅ 不影响IP地址获取功能

## 相关文件

- `programblockly.html` - 主文件，包含修复的代码
- `test_wifi_command_fix.html` - 测试页面
- `WIFI_COMMAND_FIX.md` - 本文档

## 注意事项

1. 这个修复是向后兼容的，不会影响现有功能
2. 修复后的逻辑更加清晰，避免了不必要的重复调用
3. 如果将来需要修改WiFi命令的逻辑，只需要修改`sendWifiCommand()`函数即可 
