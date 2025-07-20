# 配置持久化功能说明

## 概述

在PetoiWebBlock中添加了配置持久化功能，当点击快速连接但检测到没有可用串口时，系统会尝试使用localStorage中保存的IP地址进行连接。如果连接不成功，再打开WiFi配置对话框。

## 功能特性

### 1. 配置数据结构
localStorage中保存的配置包含以下信息：
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
3. 如果串口连接失败，尝试使用localStorage中保存的IP地址
4. 如果保存的IP地址也连接失败，才显示WiFi配置对话框

### 3. 自动保存功能
- 当检测到新的IP地址时，自动保存到localStorage
- 维护连接历史记录
- 更新最后连接时间
- 页面刷新后自动恢复配置

## 技术实现

### 1. 配置操作函数

#### 加载配置
```javascript
async function loadConfig() {
  try {
    // 首先尝试从localStorage加载配置
    const localStorageConfig = localStorage.getItem('petoiConfig');
    if (localStorageConfig) {
      try {
        const parsedConfig = JSON.parse(localStorageConfig);
        config = { ...config, ...parsedConfig };
        console.log('Configuration loaded from localStorage:', config);
        return; // 如果从localStorage成功加载，就不需要从文件加载了
      } catch (parseError) {
        console.warn('Failed to parse localStorage config:', parseError);
      }
    }
    
    // 如果localStorage中没有配置或解析失败，使用默认配置
    console.log('No localStorage config found, using default configuration');
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error);
  }
}
```

#### 保存配置
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
    
    // 保存到localStorage，这样页面刷新后配置不会丢失
    try {
      localStorage.setItem('petoiConfig', JSON.stringify(config));
      console.log('Configuration saved to localStorage:', config);
    } catch (localStorageError) {
      console.warn('Failed to save to localStorage:', localStorageError);
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
      
      // 串口连接失败，尝试使用localStorage中保存的IP地址
      const connectedWithConfig = await tryConnectWithConfigIP();
      
      if (!connectedWithConfig) {
        // 如果保存的IP地址也连接失败，显示WiFi配置对话框
        console.log('Both serial and saved IP failed, showing WiFi config dialog');
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
- 用户首次使用时，localStorage中没有保存的配置
- 系统会使用默认IP地址（192.168.4.1）
- 连接成功后，新的IP地址会自动保存到localStorage中

### 2. 日常使用
- 用户再次使用时，系统会自动从localStorage加载上次的配置
- 如果设备IP地址没有变化，可以快速连接
- 如果IP地址已变化，会回退到WiFi配置流程

### 3. 多设备环境
- localStorage会保存连接历史记录
- 用户可以在多个设备之间切换
- 系统会尝试使用最近成功连接的IP地址

### 4. 隐私模式使用
- 在浏览器隐私模式下，localStorage可能不可用
- 系统会回退到内存存储，仅在当前会话有效
- 页面刷新后需要重新配置

## 优势

1. **提高连接成功率**：利用历史连接信息，减少手动配置
2. **改善用户体验**：减少重复的WiFi配置操作
3. **智能回退**：在串口连接失败时提供备选方案
4. **历史记录**：保存连接历史，便于多设备管理

## 存储方案

### 主要存储方式：localStorage
系统使用浏览器的localStorage API作为主要的配置持久化方案：

- **持久化存储**：配置数据保存在浏览器的localStorage中，页面刷新后不会丢失
- **自动加载**：页面加载时自动从localStorage恢复上次的配置
- **实时保存**：连接成功后自动更新并保存配置到localStorage
- **键名**：使用`petoiConfig`作为localStorage的键名

### 回退机制
当localStorage不可用时（如隐私模式或存储空间不足），系统会：

- **内存存储**：将配置保存在内存中，仅在当前会话有效
- **默认配置**：使用预设的默认配置值
- **错误处理**：记录警告日志但不影响功能使用

### 配置数据结构
```json
{
  "lastKnownIP": "192.168.4.1",
  "lastConnectedTime": "2024-01-01T12:00:00.000Z",
  "connectionHistory": ["192.168.1.100", "192.168.4.1"],
  "autoConnect": true,
  "connectionTimeout": 5000
}
```

### 未来改进
- **服务器同步**：添加服务器端配置同步功能，支持多设备配置共享
- **配置界面**：提供可视化的配置管理界面
- **备份恢复**：支持配置的导入导出功能

## 注意事项

1. **浏览器兼容性**：localStorage在所有现代浏览器中都支持，但在隐私模式下可能不可用
2. **存储限制**：localStorage有存储大小限制（通常5-10MB），但配置数据很小
3. **网络环境**：配置的IP地址可能因为网络环境变化而失效
4. **数据安全**：配置数据仅存储在本地浏览器中，不会上传到服务器

## 修复记录

### 2024年修复内容

1. **串口选择失败处理**：
   - 修改了`openSerialPort`函数，当串口选择失败或连接失败时，会抛出异常而不是返回
   - 确保在用户取消串口选择或选择的串口无法连接时，会尝试使用localStorage中保存的IP地址

2. **配置保存逻辑修复**：
   - 修复了`tryConnectWithConfigIP`函数中的配置保存逻辑
   - 在成功建立连接后，正确更新config中的连接时间
   - 确保IP地址变化时能正确保存到localStorage中

3. **异常处理改进**：
   - 改进了串口连接失败时的异常处理
   - 确保所有连接失败的情况都能正确回退到localStorage中保存的IP地址尝试

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

1. **服务器同步**：添加服务器端配置同步功能，支持多设备配置共享
2. **配置界面**：提供可视化的配置管理界面
3. **连接测试**：添加连接质量测试功能
4. **配置备份**：支持配置的导入导出功能
5. **高级存储**：考虑使用IndexedDB进行更复杂的配置数据管理 
