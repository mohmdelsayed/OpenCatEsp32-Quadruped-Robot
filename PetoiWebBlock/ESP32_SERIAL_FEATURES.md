# ESP32串口智能检测功能

## 功能概述

PetoiWebBlock现在支持智能检测和过滤ESP32开发板的串口设备，提供更好的用户体验。

## 主要特性

### 1. 系统识别
- 自动检测当前操作系统（Windows、macOS、Linux、Chromebook）
- 根据不同系统采用不同的串口显示策略

### 2. ESP32串口芯片支持
支持以下ESP32开发板常用的USB串口芯片：

| 芯片型号 | Vendor ID | Product ID | 说明 |
|---------|-----------|------------|------|
| CH340   | 0x1a86    | 0x7523     | 常见的ESP32串口芯片 |
| CH343   | 0x1a86    | 0x55d4     | CH340的升级版本 |
| CP2102  | 0x10c4    | 0xea60     | Silicon Labs串口芯片 |
| CP2102变种 | 0x10c4 | 0xea61     | CP2102的某些变种 |
| CH340变种 | 0x1a86 | 0x5523     | CH340的某些变种 |

### 3. 智能串口过滤
- 自动过滤出ESP32相关的串口设备
- 隐藏不相关的串口，减少用户困惑
- 支持多个ESP32设备的选择

### 4. 跨平台显示优化

#### Windows系统
- 显示格式：`CH340 ESP32` 或 `CP2102 ESP32`
- 由于Web Serial API限制，无法直接获取COM端口号

#### macOS/Linux系统
- 显示格式：`CH340 (ESP32)` 或 `CP2102 (ESP32)`
- 自动识别usbmodem和usbserial设备

#### 其他系统
- 显示格式：`CH340 ESP32` 或 `CP2102 ESP32`

## 使用方法

### 1. 连接ESP32串口
1. 点击"连接串口"按钮
2. 系统会自动检测已授权的ESP32串口
3. 如果只有一个ESP32串口，会自动连接
4. 如果有多个ESP32串口，会显示选择对话框
5. 如果没有找到ESP32串口，会提示用户选择新的串口

### 2. 串口选择对话框
- 显示所有可用的ESP32串口设备
- 每个设备显示芯片型号和ESP32标识
- 点击设备名称即可选择连接
- 支持取消操作

### 3. 连接状态显示
- 串口标题会显示当前连接的设备信息
- 格式：`ESP32串口监视器 - CH340 (ESP32)`

## 技术实现

### 核心函数

#### `detectOperatingSystem()`
检测当前操作系统类型

#### `isESP32SerialPort(port)`
检查串口是否为ESP32开发板使用的芯片

#### `getESP32PortDisplayName(port)`
根据操作系统获取串口的显示名称

#### `getESP32SerialPorts()`
获取并过滤ESP32串口列表

#### `createESP32PortSelector(ports)`
创建ESP32串口选择对话框

### 配置常量

```javascript
const ESP32_USB_CHIPS = [
  { vendorId: 0x1a86, productId: 0x7523, name: 'CH340' },
  { vendorId: 0x1a86, productId: 0x55d4, name: 'CH343' },
  { vendorId: 0x10c4, productId: 0xea60, name: 'CP2102' },
  { vendorId: 0x10c4, productId: 0xea61, name: 'CP2102' },
  { vendorId: 0x1a86, productId: 0x5523, name: 'CH340' },
];
```

## 测试

### 测试页面
使用 `test_esp32_serial.html` 页面可以测试：
- 系统检测功能
- Web Serial API支持
- 串口列表获取
- ESP32设备检测

### 测试步骤
1. 在Chrome浏览器中打开测试页面
2. 连接ESP32开发板
3. 点击"测试ESP32检测"按钮
4. 查看检测结果

## 浏览器兼容性

- **Chrome 89+**: 完全支持
- **Edge 89+**: 完全支持
- **其他浏览器**: 不支持Web Serial API

## 注意事项

1. 需要HTTPS环境或localhost才能使用Web Serial API
2. 首次连接需要用户授权
3. 某些ESP32开发板可能使用不同的USB芯片
4. 如果遇到兼容性问题，可以手动选择串口

## 故障排除

### 问题：找不到ESP32串口
**解决方案：**
1. 确保ESP32开发板已连接
2. 检查USB驱动是否正确安装
3. 尝试重新插拔USB线
4. 检查浏览器是否支持Web Serial API

### 问题：串口连接失败
**解决方案：**
1. 检查串口是否被其他程序占用
2. 确保波特率设置为115200
3. 尝试重启浏览器
4. 检查ESP32开发板是否正常工作

### 问题：显示名称不正确
**解决方案：**
1. 检查USB芯片是否在支持列表中
2. 如果使用新的芯片，可以添加到`ESP32_USB_CHIPS`配置中
3. 更新浏览器到最新版本

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本
- 支持CH340、CH343、CP2102芯片
- 跨平台系统检测
- 智能串口过滤
- 多设备选择对话框 
