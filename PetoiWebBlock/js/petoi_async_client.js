/**
 * PetoiWebBlock WebSocket客户端
 * 实现实时双向通信
 */


class PetoiAsyncClient
{
    constructor(baseUrl = null)
    {
        this.baseUrl = baseUrl || `ws://${window.location.hostname}:81`;
        this.taskTimeout = 20000; // 20秒默认超时（优化超时时间，提高响应速度）
        this.ws = null;
        this.connected = false;
        this.pendingTasks = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 500; // 减少初始重连延迟
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.heartbeatIntervalMs = 3000;  // 3秒发送一次心跳（更频繁的心跳）
        this.heartbeatTimeoutMs = 10000;  // 10秒没有响应就重连（更快的检测）
        this.lastHeartbeatTime = 0;       // 记录最后一次心跳时间
        this.eventTarget = new EventTarget();
        this.clientId = Date.now().toString(); // 唯一客户端ID
        
        // 连接健康检查
        this.healthCheckInterval = null;
        this.healthCheckIntervalMs = 5000; // 5秒检查一次连接健康状态（更频繁的检测）
        this.autoReconnect = true; // 自动重连开关
        this.connectionTimeout = 10000; // 连接超时10秒（快速连接）
        
        // 连接状态监控
        this.lastActivityTime = 0; // 最后活动时间
        this.connectionStartTime = 0; // 连接开始时间
    }

    /**
     * 启动心跳
     */
    startHeartbeat()
    {
        // 清除可能存在的旧心跳
        this.stopHeartbeat();

        // 设置心跳定时器
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendHeartbeat();
                
                // 设置心跳超时
                this.heartbeatTimeout = setTimeout(() => {
                    console.log(getText('heartbeatTimeout'));
                    this.handleConnectionFailure('Heartbeat timeout');
                }, this.heartbeatTimeoutMs);
            }
        }, this.heartbeatIntervalMs);
        
        // 立即发送第一个心跳
        setTimeout(() => {
            if (this.connected) {
                this.sendHeartbeat();
            }
        }, 1000);
    }

    /**
     * 停止心跳
     */
    stopHeartbeat()
    {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log(getText('heartbeatStopped'));
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    /**
     * 启动连接健康检查
     */
    startHealthCheck()
    {
        this.stopHealthCheck();
        
        this.healthCheckInterval = setInterval(() => {
            if (this.connected && this.ws) {
                this.checkConnectionHealth();
            }
        }, this.healthCheckIntervalMs);
    }

    /**
     * 停止连接健康检查
     */
    stopHealthCheck()
    {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * 检查连接健康状态
     */
    checkConnectionHealth()
    {
        if (!this.connected || !this.ws) {
            return false;
        }

        // 检查WebSocket状态
        if (this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not in OPEN state, attempting reconnect...');
            this.handleConnectionFailure('WebSocket not open');
            return false;
        }

        // 检查最后活动时间
        const now = Date.now();
        if (now - this.lastActivityTime > this.heartbeatTimeoutMs * 2) {
            console.log('No activity detected, attempting reconnect...');
            this.handleConnectionFailure('No activity detected');
            return false;
        }

        return true;
    }

    /**
     * 处理连接失败
     */
    handleConnectionFailure(reason)
    {
        console.log(`Connection failure: ${reason}`);
        this.connected = false;
        this.stopHeartbeat();
        this.stopHealthCheck();
        
        if (this.autoReconnect) {
            this.handleReconnect();
        }
        
        // 触发连接失败事件
        this.eventTarget.dispatchEvent(new CustomEvent('connectionFailed', {
            detail: { reason: reason }
        }));
    }

    /**
     * 连接到WebSocket服务器
     */
    async connect()
    {
        return new Promise((resolve, reject) => {
            // 如果已有连接，先断开
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            this.connectionStartTime = Date.now();
            
            try {
                this.ws = new WebSocket(this.baseUrl);

                // 设置连接超时
                const connectionTimeout = setTimeout(() => {
                    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                        console.log('Connection timeout');
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, this.connectionTimeout);

                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.lastActivityTime = Date.now();
                    console.log(getText('websocketConnected'));
                    
                    // 启动心跳和健康检查
                    this.startHeartbeat();
                    this.startHealthCheck();
                    
                    resolve();
                };

                this.ws.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    this.connected = false;
                    this.stopHeartbeat();
                    this.stopHealthCheck();
                    
                    console.log(getText('websocketClosed'), event.code, event.reason);
                    
                    // 如果不是正常关闭，尝试重连
                    if (event.code !== 1000 && this.autoReconnect) {
                        this.handleConnectionFailure('Connection closed unexpectedly');
                    }
                };

                this.ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error(getText('websocketError'), error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.lastActivityTime = Date.now();
                    this.handleMessage(event.data);
                };
                
            } catch (error) {
                clearTimeout(connectionTimeout);
                console.error('Failed to create WebSocket connection:', error);
                reject(error);
            }
        });
    }

    /**
     * 处理重连
     */
    handleReconnect()
    {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避
            console.log(getText('reconnectAttempt').replace('{current}', this.reconnectAttempts).replace('{max}', this.maxReconnectAttempts) + ` (delay: ${delay}ms)`);
            
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('Reconnect failed:', error);
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.handleReconnect();
                    } else {
                        console.error(getText('maxReconnectAttempts'));
                        this.eventTarget.dispatchEvent(new CustomEvent('maxReconnectAttemptsReached'));
                    }
                });
            }, delay);
        } else {
            console.error(getText('maxReconnectAttempts'));
            this.eventTarget.dispatchEvent(new CustomEvent('maxReconnectAttemptsReached'));
        }
    }

    /**
     * 发送心跳消息
     */
    sendHeartbeat()
    {
        if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
            console.log(getText('heartbeatSent').replace('{time}', timeSinceLastHeartbeat));
            
            const heartbeatMessage = {
                type: 'heartbeat',
                timestamp: now
            };
            
            try {
                this.ws.send(JSON.stringify(heartbeatMessage));
                this.lastHeartbeatTime = now;
                this.lastActivityTime = now;
            } catch (error) {
                console.error('Failed to send heartbeat:', error);
                this.handleConnectionFailure('Heartbeat send failed');
            }
        }
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(data)
    {
        try {
            console.log('handleMessage', data);
            
            // 检查data是否为null或undefined
            if (!data) {
                console.warn('Received null or undefined data in handleMessage');
                return;
            }
            
            // 清理数据中的特殊字符
            const cleanData = data.replace(/[\r\n\t\f\v]/g, ' ').trim();
            const message = JSON.parse(cleanData);
            console.log('message type', message.type);
            
            // 更新最后活动时间
            this.lastActivityTime = Date.now();
            
            // 处理心跳响应
            if (message.type === 'heartbeat') {
                const now = Date.now();
                const latency = now - this.lastHeartbeatTime;
                console.log(getText('heartbeatResponse').replace('{latency}', latency));
                if (this.heartbeatTimeout) {
                    clearTimeout(this.heartbeatTimeout);
                    this.heartbeatTimeout = null;
                }
                return;
            }

            // 处理连接成功响应
            if (message.type === 'connected') {
                console.log('Connection confirmed by server');
                return;
            }

            // 处理错误消息
            if (message.error) {
                console.error(getText('serverError'), message.error);
                this.eventTarget.dispatchEvent(new CustomEvent('serverError', {
                    detail: { error: message.error }
                }));
                return;
            }

            // 处理任务相关消息
            if (message.taskId && this.pendingTasks.has(message.taskId)) {
                const task = this.pendingTasks.get(message.taskId);
                
                switch (message.status) {
                    case 'running':
                        task.onProgress && task.onProgress(message);
                        break;
                    case 'completed':
                        if (message.results && message.results.length > 0) {
                            task.resolve(message.results);
                        } else {
                            task.reject(new Error("response no results"));
                        }
                        this.pendingTasks.delete(message.taskId);
                        break;
                    case 'error':
                        task.reject(new Error(message.error || 'Task failed'));
                        this.pendingTasks.delete(message.taskId);
                        break;
                }
                return;
            }

            if (message.event) {
                this.eventTarget.dispatchEvent(new CustomEvent(message.event, message));
            }
        } catch (error) {
            console.error(getText('messageProcessingError'), error);
            console.error(getText('rawData'), data);
        }
    }

    /**
     * 获取命令的超时时间
     * @param {string|Array} command - 命令或命令数组
     * @returns {number} - 超时时间（毫秒）
     */
    getCommandTimeout(command) {
        const commands = Array.isArray(command) ? command : [command];
        
        // 检查是否为传感器读取命令
        const isSensorCommand = commands.some(cmd => 
            cmd.includes('get_digital_input') || 
            cmd.includes('get_analog_input') || 
            cmd.includes('get_sensor_input') ||
            cmd.includes('get_ultrasonic_distance') ||
            cmd.includes('get_joint_angle') ||
            cmd.includes('get_all_joint_angles')
        );
        
        // 检查是否为复杂动作命令
        const isComplexAction = commands.some(cmd => 
            cmd.includes('acrobatic_moves') ||
            cmd.includes('high_difficulty_action') ||
            cmd.includes('complex_sequence')
        );
        
        if (isSensorCommand) {
            return 5000; // 传感器读取：5秒超时
        } else if (isComplexAction) {
            return 15000; // 复杂动作：15秒超时
        } else {
            return 10000; // 普通命令：10秒超时
        }
    }

    /**
     * 发送命令
     * @param {string|Array} command - 单个命令或命令数组
     * @param {number} timeout - 超时时间（毫秒），如果不指定则自动判断
     * @returns {Promise} - 返回命令执行完成后的结果
     */
    async sendCommand(command, timeout = null)
    {
        // 检查连接状态
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // 尝试重新连接
            if (this.autoReconnect) {
                console.log('Connection lost, attempting reconnect before sending command...');
                try {
                    await this.connect();
                } catch (error) {
                    throw new Error(getText('notConnected') + ' (reconnect failed)');
                }
            } else {
                throw new Error(getText('notConnected'));
            }
        }

        // 将单个命令转换为命令数组
        const commands = Array.isArray(command) ? command : [command];

        if (commands.length === 0) {
            throw new Error('Invalid command');
        }

        // 如果没有指定超时时间，则自动判断
        const actualTimeout = timeout || this.getCommandTimeout(commands);

        return new Promise((resolve, reject) => {
            const taskId = Date.now().toString();
            const message = {
                type: 'command',
                taskId: taskId,
                commands: commands,
                timestamp: Date.now()
            };

            const timeoutId = setTimeout(() => {
                this.pendingTasks.delete(taskId);
                reject(new Error(getText('commandTimeout') + ' ' + taskId + ' ' + commands.join(' ') + ' (timeout: ' + actualTimeout + 'ms)'));
            }, actualTimeout);

            this.pendingTasks.set(taskId, {
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    if (Array.isArray(command)) {
                        resolve(result.map(item => parseInt(item) || 0));
                    } else {
                        resolve(result[0]);
                    }
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
            
            const messageStr = JSON.stringify(message);
            // 只在debug模式下打印完整的JSON消息
            if (typeof showDebug !== 'undefined' && showDebug) {
                console.log('send message', messageStr);
            }
            
            try {
                this.ws.send(messageStr);
                this.lastActivityTime = Date.now();
            } catch (error) {
                clearTimeout(timeoutId);
                this.pendingTasks.delete(taskId);
                this.handleConnectionFailure('Send command failed');
                reject(error);
            }
        });
    }

    /**
     * 关闭连接
     */
    disconnect()
    {
        this.autoReconnect = false; // 禁用自动重连
        this.stopHeartbeat(); // 停止心跳
        this.stopHealthCheck(); // 停止健康检查
        
        if (this.ws)
        {
            this.ws.close(1000, 'Client disconnect'); // 正常关闭
            this.ws = null;
            this.connected = false;
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            connected: this.connected,
            readyState: this.ws ? this.ws.readyState : null,
            reconnectAttempts: this.reconnectAttempts,
            lastActivityTime: this.lastActivityTime,
            connectionDuration: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
        };
    }

    /**
     * 启用/禁用自动重连
     */
    setAutoReconnect(enabled) {
        this.autoReconnect = enabled;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetoiAsyncClient;
}
