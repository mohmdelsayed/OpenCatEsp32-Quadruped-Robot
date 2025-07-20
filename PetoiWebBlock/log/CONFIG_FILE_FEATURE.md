# 配置文件功能说明

## 概述

在PetoiWebBlock中添加了配置文件功能，当点击快速连接但检测到没有可用串口时，系统会尝试使用配置文件中保存的IP地址进行连接。如果连接不成功，再打开WiFi配置对话框。

## 功能特性

### 1. 配置文件结构
配置文件 `config.json` 包含以下信息：
```json
{
  "lastKnownIP": "192.168.4.1",
  "lastConnectedTime": "",
  "connectionHistory": [],
  "autoConnect": true,
  "connectionTimeout": 5000
}
```

- `lastKnownIP`: 最后成功连接的IP地址
- `lastConnectedTime`: 最后连接的时间戳
- `connectionHistory`: 连接历史记录（最多保存10个）
- `autoConnect`: 是否启用自动连接
- `connectionTimeout`: 连接超时时间（毫秒）

### 2. 连接流程

#### 原始流程：
1. 点击"Quick Connect"按钮
2. 尝试连接串口
3. 如果串口连接失败，直接显示WiFi配置对话框

#### 新流程：
1. 点击"Quick Connect"按钮
2. 尝试连接串口
3. 如果串口连接失败，尝试使用配置文件中的IP地址
4. 如果配置的IP地址也连接失败，才显示WiFi配置对话框

### 3. 自动保存功能
- 当检测到新的IP地址时，自动保存到配置文件
- 维护连接历史记录
- 更新最后连接时间

## 技术实现

### 1. 配置文件操作函数

#### 加载配置文件
```javascript
async function loadConfig() {
  try {
    const response = await fetch('./config.json');
    if (response.ok) {
      const loadedConfig = await response.json();
      config = { ...config, ...loadedConfig };
      console.log('Configuration loaded:', config);
    }
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error);
  }
}
```

#### 保存配置文件
```javascript
async function saveConfig() {
  try {
    // 更新连接历史
    if (currentDeviceIP && currentDeviceIP !== config.lastKnownIP) {
      config.lastKnownIP = currentDeviceIP;
      config.lastConnectedTime = new Date().toISOString();
      
      // 添加到连接历史（最多保存10个）
      if (!config.connectionHistory.includes(currentDeviceIP)) {
        config.connectionHistory.unshift(currentDeviceIP);
        config.connectionHistory = config.connectionHistory.slice(0, 10);
      }
    }
    
    console.log('Configuration updated:', config);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}
```

#### 尝试使用配置IP连接
```javascript
async function tryConnectWithConfigIP() {
  if (!config.lastKnownIP || config.lastKnownIP === currentDeviceIP) {
    return false;
  }
  
  console.log(`Trying to connect with configured IP: ${config.lastKnownIP}`);
  
  try {
    // 尝试使用配置的IP地址创建WebSocket连接
    const testClient = new PetoiAsyncClient(`ws://${config.lastKnownIP}:81`);
    await testClient.connect();
    
    // 如果连接成功，更新当前IP地址
    currentDeviceIP = config.lastKnownIP;
    console.log(`Successfully connected with configured IP: ${currentDeviceIP}`);
    
    // 更新Quick Connect按钮状态
    const quickConnectBtn = document.getElementById('quickConnectBtn');
    if (quickConnectBtn) {
      quickConnectBtn.textContent = currentDeviceIP;
      quickConnectBtn.style.backgroundColor = '#4CAF50';
      quickConnectBtn.setAttribute('data-connected', 'true');
    }
    
    // 保存配置
    await saveConfig();
    
    return true;
  } catch (error) {
    console.log(`Failed to connect with configured IP ${config.lastKnownIP}:`, error);
    return false;
  }
}
```

### 2. 修改的quickConnect函数
```javascript
async function quickConnect() {
  // 检查串口是否已连接
  if (!port) {
    try {
      // 如果串口未连接，先尝试连接串口
      await openSerialPort();
    } catch (error) {
      console.log('Serial port connection failed, trying configured IP...');
      
      // 串口连接失败，尝试使用配置文件中的IP地址
      const connectedWithConfig = await tryConnectWithConfigIP();
      
      if (!connectedWithConfig) {
        // 如果配置的IP地址也连接失败，显示WiFi配置对话框
        console.log('Both serial and configured IP failed, showing WiFi config dialog');
        showWifiConfigDialog();
      }
    }
  } else if (writer) {
    // 如果串口已连接但需要重新获取IP地址，才调用 sendWifiCommand()
    await sendWifiCommand();
  }
}
```

## 使用场景

### 1. 首次使用
- 用户首次使用时，配置文件不存在或为空
- 系统会使用默认IP地址（192.168.4.1）
- 连接成功后，新的IP地址会被保存到配置文件

### 2. 日常使用
- 用户再次使用时，系统会尝试使用上次成功连接的IP地址
- 如果设备IP地址没有变化，可以快速连接
- 如果IP地址已变化，会回退到WiFi配置流程

### 3. 多设备环境
- 配置文件会保存连接历史记录
- 用户可以在多个设备之间切换
- 系统会尝试使用最近成功连接的IP地址

## 优势

1. **提高连接成功率**：利用历史连接信息，减少手动配置
2. **改善用户体验**：减少重复的WiFi配置操作
3. **智能回退**：在串口连接失败时提供备选方案
4. **历史记录**：保存连接历史，便于多设备管理

## 注意事项

1. **浏览器安全限制**：由于浏览器安全限制，配置文件只能读取，无法直接写入
2. **内存存储**：配置更新只保存在内存中，页面刷新后会丢失
3. **服务器支持**：实际的文件保存需要服务器端支持
4. **网络环境**：配置的IP地址可能因为网络环境变化而失效

## 修复记录

### 2024年修复内容

1. **串口选择失败处理**：
   - 修改了`openSerialPort`函数，当串口选择失败或连接失败时，会抛出异常而不是返回
   - 确保在用户取消串口选择或选择的串口无法连接时，会尝试使用配置文件中的IP地址

2. **配置保存逻辑修复**：
   - 修复了`tryConnectWithConfigIP`函数中的配置保存逻辑
   - 在成功建立连接后，正确更新config中的连接时间
   - 确保IP地址变化时能正确保存到配置中

3. **异常处理改进**：
   - 改进了串口连接失败时的异常处理
   - 确保所有连接失败的情况都能正确回退到配置文件IP尝试

4. **localStorage持久化修复**（重要）：
   - 修改了`saveConfig`函数，将配置保存到localStorage中
   - 修改了`loadConfig`函数，优先从localStorage加载配置
   - 解决了页面刷新后配置丢失的问题
   - 确保连接成功后IP地址能持久保存
   - 删除了不再需要的config.json文件

5. **积木IP更新修复**：
   - 在`tryConnectWithConfigIP`函数中添加了make_connection积木的IP更新逻辑
   - 确保使用配置IP连接成功后，积木中的IP地址也会更新
   - 解决了Quick Connect按钮IP更新但积木IP不更新的问题

6. **串口失败后Quick Connect修复**（重要）：
   - 在`openSerialPort`函数的catch块中添加了变量重置逻辑
   - 确保串口连接失败时，port、writer、reader变量都被重置为null
   - 解决了串口失败后Quick Connect无法使用配置IP的问题
   - 修复了串口连接失败后再次点击Quick Connect会显示WiFi配置页面的问题

7. **重复Quick Connect修复**（重要）：
   - 修改了`tryConnectWithConfigIP`函数的判断逻辑
   - 如果当前IP就是配置的IP，说明已经连接成功，直接返回true
   - 解决了重复点击Quick Connect无法连接的问题
   - 修复了连接成功后再次点击Quick Connect会显示WiFi配置页面的问题

8. **硬件断开连接修复**（重要）：
   - 在`closeSerialPort`函数中添加了超时处理和更好的错误处理
   - 在`readSerialData`函数中添加了硬件断开检测
   - 当硬件断开时自动清理串口连接和更新UI状态
   - 解决了硬件断开后点击Close Serial没有反应的问题
   - 添加了3秒超时机制，防止硬件断开时卡住

9. **Quick Connect按钮状态修复**：
   - 修改了`closeSerialPort`函数，只有在没有WebSocket连接时才重置Quick Connect按钮
   - 修改了`tryConnectWithConfigIP`函数，确保"Already connected"时也更新按钮文字
   - 修改了`readSerialData`函数中硬件断开处理逻辑，只有在没有WebSocket连接时才重置Quick Connect按钮
   - 修改了`openSerialPort`函数中串口连接失败的处理逻辑，只有在没有WebSocket连接时才重置Quick Connect按钮
   - 解决关闭串口后按钮状态不正确的问题
   - 解决拔掉线时Quick Connect按钮IP被消除的问题
   - 解决硬件串口线没连接时点击"连接串口"导致Quick Connect按钮IP被刷掉的问题
   - 确保按钮文字与实际连接状态保持一致

10. **传感器数据读取稳定性修复**：
    - 改进串口数据解析逻辑，添加数据完整性验证，防止数据分割导致的"3 6 3"和"363"交替出现
    - 增加串口缓冲区大小从10KB到20KB，保留更多数据防止丢失
    - 优化WebSocket心跳机制：心跳间隔从4秒减少到3秒，超时检测从15秒减少到10秒
    - 改进连接健康检查：检查间隔从10秒减少到5秒，提高连接稳定性
    - 优化重连策略：初始重连延迟从1秒减少到0.5秒，提高重连效率
    - 解决长时间读取传感器数据时的连接断开和重连问题

11. **超时时间优化**：
    - 实现智能超时机制：根据命令类型自动设置不同的超时时间
    - 传感器读取命令：5秒超时（原来60秒）
    - 普通命令：10秒超时（原来60秒）
    - 复杂动作命令：15秒超时（原来60秒）
    - 支持自定义超时时间，提高问题响应速度4-12倍
    - 添加命令类型识别功能，自动判断合适的超时时间

## 未来改进

1. **本地存储**：使用localStorage或IndexedDB保存配置
2. **服务器同步**：添加服务器端配置同步功能
3. **配置界面**：添加配置管理界面
4. **连接测试**：添加连接质量测试功能 
