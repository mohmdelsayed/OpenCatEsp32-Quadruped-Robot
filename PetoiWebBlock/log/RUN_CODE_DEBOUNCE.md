# Run Code防抖功能

## 功能概述

为run code功能添加了防抖机制和智能IP检测功能，提升用户体验和系统稳定性。

## 主要功能

### 1. 防抖机制

**时间防抖：**
- 当点击间隔小于1秒时，忽略此次点击
- 防止用户快速重复点击导致的意外执行

**状态防抖：**
- 当前一个程序正在运行时，忽略新的点击
- 防止程序重叠执行导致的冲突

### 2. 智能IP检测

**自动Quick Connect：**
- 当检测到IP地址为`192.168.4.1`时，自动执行quick connect流程
- 当检测到IP地址格式无效时，自动执行quick connect流程
- quick connect完成后延迟1秒再执行run code
- 即使quick connect失败，也会尝试执行run code

## 实现细节

### 防抖变量
```javascript
// 防抖变量
let lastRunCodeTime = 0;
let isProgramRunning = false;
```

### 防抖检查逻辑
```javascript
function runCode() {
  const now = Date.now();
  
  // 防抖检查：如果距离上次点击小于1秒，则不执行
  if (now - lastRunCodeTime < 1000) {
    console.log("防抖：点击间隔小于1秒，忽略此次点击");
    return;
  }
  
  // 检查程序是否正在运行
  if (isProgramRunning) {
    console.log("防抖：程序正在运行中，忽略此次点击");
    return;
  }
  
  // IP检测和自动连接逻辑...
}
```

### IP地址格式验证
```javascript
// IP地址格式验证函数
function isValidIPAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  // 检查是否为192.168.4.1
  if (ip === '192.168.4.1') {
    return false; // 返回false表示需要quick connect
  }
  
  // 检查IP地址格式
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}
```

### IP检测和自动连接
```javascript
// 获取积木中的IP地址
const makeConnectionBlocks = workspace.getBlocksByType('make_connection');
let blockIP = '192.168.4.1'; // 默认IP

if (makeConnectionBlocks.length > 0) {
  const mainBlock = makeConnectionBlocks[0];
  blockIP = mainBlock.getFieldValue('IP_ADDRESS') || '192.168.4.1';
}

// 检查积木中的IP地址是否需要自动执行quick connect
if (!isValidIPAddress(blockIP)) {
  console.log(`检测到积木中IP地址为"${blockIP}"，格式无效或为默认IP，自动执行quick connect`);
  quickConnect().then(() => {
    // quick connect完成后，延迟1秒再执行runCode
    setTimeout(() => {
      executeRunCode();
    }, 1000);
  }).catch((error) => {
    console.error("Quick connect失败:", error);
    // 即使quick connect失败，也尝试执行runCode
    executeRunCode();
  });
  return;
}
```

### 程序状态管理
```javascript
function executeRunCode() {
  const now = Date.now();
  lastRunCodeTime = now;
  isProgramRunning = true;
  
  // ... 程序执行逻辑 ...
  
  // 程序执行完成后，重置运行状态
  isProgramRunning = false;
  console.log("程序执行完成");
}
```

## 使用场景

### 1. 防止误操作
- 用户快速点击run code按钮时，只有第一次点击有效
- 避免程序重复执行导致的资源浪费

### 2. 程序保护
- 当前程序正在运行时，新的点击被忽略
- 防止程序冲突和数据竞争

### 3. 智能连接
- 当设备使用默认IP时，自动尝试建立连接
- 减少用户手动操作的步骤

## 测试验证

创建了测试页面 `test_run_code_debounce.html` 来验证功能：

### 测试项目
1. **时间防抖测试**：快速点击按钮验证防抖效果
2. **状态防抖测试**：程序运行时点击验证状态保护
3. **IP检测测试**：设置不同IP地址测试自动连接
4. **Quick Connect测试**：验证自动连接流程

### 测试用例
- 快速连续点击 → 只有第一次有效
- 程序运行中点击 → 被忽略
- 积木IP为192.168.4.1时点击 → 自动执行quick connect
- 积木IP为有效IP时点击 → 直接执行run code
- 积木IP格式无效时点击 → 自动执行quick connect
- 积木IP为空时点击 → 自动执行quick connect
- 修改积木IP后点击 → 根据新IP决定是否自动连接

## 日志输出

### 防抖日志
```
防抖：点击间隔小于1秒，忽略此次点击
防抖：程序正在运行中，忽略此次点击
```

### IP检测日志
```
检测到积木中IP地址为"192.168.4.1"，格式无效或为默认IP，自动执行quick connect
检测到积木中IP地址为"invalid.ip.address"，格式无效或为默认IP，自动执行quick connect
检测到积木中IP地址为""，格式无效或为默认IP，自动执行quick connect
执行Quick Connect...
Quick Connect完成
开始执行程序...
程序执行完成
```

## 兼容性

- ✅ 向后兼容：不影响现有功能
- ✅ 错误处理：quick connect失败时仍会尝试执行run code
- ✅ 状态恢复：程序执行完成后正确重置状态
- ✅ 日志记录：提供详细的执行状态信息

## 修复记录

### v1.1 - 积木IP地址检测修复
**问题**：在成功连接后，如果修改了积木中的IP地址，再次点击run code时没有执行测试连接的流程。

**原因**：之前的逻辑只检查`currentDeviceIP`变量，但用户修改积木中的IP地址后，该变量可能还是旧值。

**解决方案**：
- 改为检查积木中的实际IP地址：`block.getFieldValue('IP_ADDRESS')`
- 确保每次点击run code时都读取最新的积木配置
- 保持向后兼容性，如果没有积木则使用默认IP

**影响**：
- ✅ 修复了修改积木IP后不自动连接的问题
- ✅ 提升了用户体验的一致性
- ✅ 保持了原有功能的稳定性

### v1.2 - IP地址格式验证增强
**问题**：需要支持更多场景的自动连接，包括IP地址格式无效的情况。

**原因**：用户可能输入无效的IP地址格式，系统应该自动处理这种情况。

**解决方案**：
- 添加IP地址格式验证函数`isValidIPAddress()`
- 支持检测192.168.4.1和无效IP格式
- 使用正则表达式验证IP地址格式的有效性

**影响**：
- ✅ 支持无效IP格式的自动处理
- ✅ 增强了IP地址验证的健壮性
- ✅ 提供了更友好的错误处理

### v1.3 - Debug信息优化和翻译完善（续）
**问题**：连接相关的日志信息应该属于debug info，并且有些信息缺少翻译。

**原因**：用户反馈连接失败、心跳超时、防抖等信息应该只在debug模式下显示，并且需要多语言支持。

**解决方案**：
- 将所有连接相关的日志信息包装在`showDebug`检查中
- 添加缺失的翻译键值对
- 支持中文、英文、日文三种语言
- 将防抖信息也纳入debug模式控制

**新增翻译**：
- `connectionFailure`: "连接失败: {reason}"
- `heartbeatTimeout`: "心跳超时"
- `debounceTimeInterval`: "防抖：点击间隔小于1秒，忽略此次点击"
- `debounceProgramRunning`: "防抖：程序正在运行中，忽略此次点击"
- `programExecutionStarted`: "开始执行程序..."
- `programExecutionCompleted`: "程序执行完成"
- `detectedInvalidIP`: "检测到积木中IP地址为\"{ip}\"，格式无效或为默认IP，自动执行quick connect"

**影响**：
- ✅ 减少了普通模式下的日志噪音
- ✅ 完善了多语言支持
- ✅ 提升了用户体验的一致性
- ✅ 保持了debug模式的完整性
- ✅ 程序执行状态信息也支持多语言
- ✅ 连接细节信息只在debug模式下显示
- ✅ 增加了console历史记录长度限制（从100条增加到500条）

## 总结

通过添加防抖机制和智能IP检测，run code功能变得更加稳定和用户友好：

1. **提升稳定性**：防止重复执行和程序冲突
2. **改善体验**：自动处理连接问题，减少手动操作
3. **增强保护**：程序运行状态管理，避免资源浪费
4. **智能识别**：根据积木中的IP地址自动选择合适的执行策略
5. **实时响应**：及时检测积木配置变化并作出相应处理
6. **格式验证**：自动检测和处理无效IP地址格式
7. **Debug优化**：连接相关日志只在debug模式下显示
8. **多语言支持**：完善了中文、英文、日文翻译
9. **Console优化**：增加历史记录长度，优化显示效果 
