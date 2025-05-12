/**
 * 移动设备触摸控制模块
 * 通过滑动手势控制游戏，使游戏可以在没有物理键盘的设备上玩
 */
const TouchControls = {
    // 配置
    config: {
        // 是否启用触摸控制
        enabled: true,
        // 滑动灵敏度 - 需要多大的滑动距离才触发方向控制
        swipeSensitivity: 30,
        // 是否显示调试信息
        debug: false,
        // 是否显示触摸指示器
        showTouchIndicator: true,
        // 触摸指示器大小
        indicatorSize: 80,
        // 触摸指示器颜色
        indicatorColor: 'rgba(255, 255, 255, 0.3)',
        // 触摸指示器边框颜色
        indicatorBorderColor: 'rgba(0, 0, 0, 0.5)',
        // 方向指示器颜色
        directionColor: 'rgba(245, 166, 35, 0.7)'
    },

    // 触摸状态
    touch: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        direction: null
    },

    // 按键状态
    keyStates: {
        up: false,
        down: false,
        left: false,
        right: false
    },

    // 按键代码映射
    keyCodes: {
        up: 38,    // 上箭头键
        down: 40,  // 下箭头键
        left: 37,  // 左箭头键
        right: 39  // 右箭头键
    },

    // 触摸指示器元素
    indicator: null,
    directionIndicator: null,

    // 初始化
    init: function() {
        console.log('初始化触摸滑动控制...');

        // 检查是否是移动设备
        if (!this.isMobileDevice()) {
            console.log('非移动设备，不启用触摸控制');
            return;
        }

        // 创建触摸指示器
        if (this.config.showTouchIndicator) {
            this.createTouchIndicator();
        }

        // 添加事件监听器
        this.addEventListeners();

        console.log('触摸滑动控制初始化完成');
    },

    // 检测是否是移动设备
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 创建触摸指示器
    createTouchIndicator: function() {
        console.log('创建触摸指示器...');

        // 创建触摸指示器容器
        var container = document.createElement('div');
        container.id = 'touch-indicator-container';
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; user-select: none; -webkit-user-select: none; display: none;';

        // 创建主触摸指示器
        this.indicator = document.createElement('div');
        this.indicator.id = 'touch-indicator';
        this.indicator.style.cssText = 'position: absolute; width: ' + this.config.indicatorSize + 'px; height: ' + this.config.indicatorSize + 'px; border-radius: 50%; background-color: ' + this.config.indicatorColor + '; border: 2px solid ' + this.config.indicatorBorderColor + '; display: flex; justify-content: center; align-items: center; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s;';

        // 创建方向指示器
        this.directionIndicator = document.createElement('div');
        this.directionIndicator.id = 'direction-indicator';
        this.directionIndicator.style.cssText = 'position: absolute; width: 0; height: 0; background-color: ' + this.config.directionColor + '; transform-origin: center; border-radius: 5px;';

        // 添加到容器
        this.indicator.appendChild(this.directionIndicator);
        container.appendChild(this.indicator);
        document.body.appendChild(container);

        console.log('触摸指示器创建完成');
    },

    // 添加事件监听器
    addEventListeners: function() {
        console.log('添加触摸事件监听器...');

        // 获取游戏容器
        const gameContainer = document.getElementById('container');
        if (!gameContainer) {
            console.error('找不到游戏容器元素');
            return;
        }

        // 触摸开始
        gameContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });

        // 触摸移动
        gameContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });

        // 触摸结束
        gameContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // 触摸取消
        gameContainer.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

        console.log('触摸事件监听器添加完成');
    },

    // 处理触摸开始事件
    handleTouchStart: function(e) {
        e.preventDefault();

        // 获取第一个触摸点
        const touch = e.touches[0];

        // 记录起始位置
        this.touch.startX = touch.clientX;
        this.touch.startY = touch.clientY;
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;
        this.touch.active = true;
        this.touch.direction = null;

        // 重置所有按键状态
        this.resetAllKeys();

        // 显示触摸指示器
        if (this.config.showTouchIndicator) {
            this.showTouchIndicator(touch.clientX, touch.clientY);
        }

        if (this.config.debug) {
            console.log('触摸开始:', touch.clientX, touch.clientY);
        }
    },

    // 处理触摸移动事件
    handleTouchMove: function(e) {
        if (!this.touch.active) return;

        e.preventDefault();

        // 获取第一个触摸点
        const touch = e.touches[0];

        // 更新当前位置
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;

        // 计算滑动距离
        const deltaX = this.touch.currentX - this.touch.startX;
        const deltaY = this.touch.currentY - this.touch.startY;

        // 更新触摸指示器
        if (this.config.showTouchIndicator) {
            this.updateTouchIndicator(deltaX, deltaY);
        }

        // 确定滑动方向
        this.determineDirection(deltaX, deltaY);

        if (this.config.debug) {
            console.log('触摸移动:', deltaX, deltaY, '方向:', this.touch.direction);
        }
    },

    // 处理触摸结束事件
    handleTouchEnd: function(e) {
        e.preventDefault();

        // 重置触摸状态
        this.touch.active = false;

        // 重置所有按键状态
        this.resetAllKeys();

        // 隐藏触摸指示器
        if (this.config.showTouchIndicator) {
            this.hideTouchIndicator();
        }

        if (this.config.debug) {
            console.log('触摸结束');
        }
    },

    // 确定滑动方向
    determineDirection: function(deltaX, deltaY) {
        // 计算滑动距离
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 如果滑动距离小于灵敏度阈值，不触发方向控制
        if (distance < this.config.swipeSensitivity) {
            // 重置所有按键状态
            this.resetAllKeys();
            return;
        }

        // 计算滑动角度
        let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        if (angle < 0) {
            angle += 360;
        }

        // 根据角度确定方向
        let direction;
        if (angle >= 45 && angle < 135) {
            direction = 'down';
        } else if (angle >= 135 && angle < 225) {
            direction = 'left';
        } else if (angle >= 225 && angle < 315) {
            direction = 'up';
        } else {
            direction = 'right';
        }

        // 如果方向发生变化，更新按键状态
        if (this.touch.direction !== direction) {
            // 重置所有按键状态
            this.resetAllKeys();

            // 设置新的方向
            this.touch.direction = direction;

            // 触发对应方向的按键
            this.keyStates[direction] = true;
            this.triggerKeyEvent('keydown', this.keyCodes[direction]);

            if (this.config.debug) {
                console.log('方向变化:', direction);
            }
        }
    },

    // 重置所有按键状态
    resetAllKeys: function() {
        for (const direction in this.keyStates) {
            if (this.keyStates[direction]) {
                this.keyStates[direction] = false;
                this.triggerKeyEvent('keyup', this.keyCodes[direction]);
            }
        }
        this.touch.direction = null;
    },

    // 显示触摸指示器
    showTouchIndicator: function(x, y) {
        const container = document.getElementById('touch-indicator-container');
        if (!container) return;

        container.style.display = 'block';

        this.indicator.style.left = x + 'px';
        this.indicator.style.top = y + 'px';
        this.indicator.style.opacity = '1';

        // 重置方向指示器
        this.directionIndicator.style.width = '0';
        this.directionIndicator.style.height = '0';
    },

    // 更新触摸指示器
    updateTouchIndicator: function(deltaX, deltaY) {
        if (!this.indicator) return;

        // 计算滑动距离
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 如果滑动距离小于灵敏度阈值，隐藏方向指示器
        if (distance < this.config.swipeSensitivity) {
            this.directionIndicator.style.width = '0';
            this.directionIndicator.style.height = '0';
            return;
        }

        // 计算滑动角度
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        // 更新方向指示器
        const maxLength = this.config.indicatorSize / 2;
        const length = Math.min(distance, maxLength);

        this.directionIndicator.style.width = length + 'px';
        this.directionIndicator.style.height = '10px';
        this.directionIndicator.style.transform = 'rotate(' + angle + 'deg)';
    },

    // 隐藏触摸指示器
    hideTouchIndicator: function() {
        const container = document.getElementById('touch-indicator-container');
        if (!container) return;

        this.indicator.style.opacity = '0';

        // 延迟隐藏容器，让淡出动画有时间执行
        setTimeout(function() {
            container.style.display = 'none';
        }, 200);
    },

    // 触发键盘事件
    triggerKeyEvent: function(eventType, keyCode) {
        // 获取键码对应的键名和代码
        var keyName = this.getKeyString(keyCode);
        var keyCodeString = this.getKeyCodeString(keyCode);

        // 直接调用GEMIOLI游戏引擎的处理函数
        // 这是最可靠的方法，因为它绕过了事件系统
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            if (eventType === 'keydown') {
                if (typeof GEMIOLI.Application.onKeyDown === 'function') {
                    // 创建一个简单的事件对象，只包含必要的属性
                    var simpleEvent = { keyCode: keyCode, key: keyName, code: keyCodeString };
                    GEMIOLI.Application.onKeyDown(simpleEvent);

                    if (this.config.debug) {
                        console.log('触发键盘事件: ' + eventType + ', keyCode: ' + keyCode);
                    }
                    return; // 成功调用了游戏引擎的方法，不需要继续
                }
            } else if (eventType === 'keyup') {
                if (typeof GEMIOLI.Application.onKeyUp === 'function') {
                    var simpleEvent = { keyCode: keyCode, key: keyName, code: keyCodeString };
                    GEMIOLI.Application.onKeyUp(simpleEvent);

                    if (this.config.debug) {
                        console.log('触发键盘事件: ' + eventType + ', keyCode: ' + keyCode);
                    }
                    return; // 成功调用了游戏引擎的方法，不需要继续
                }
            }
        }

        // 如果无法直接调用游戏引擎方法，尝试使用事件
        try {
            // 尝试使用旧版的事件创建方法
            var event;

            if (document.createEvent) {
                // 创建事件
                event = document.createEvent('KeyboardEvent');

                // 初始化事件
                if (event.initKeyboardEvent) {
                    event.initKeyboardEvent(
                        eventType,
                        true,
                        true,
                        window,
                        keyName,
                        0,
                        false,
                        false,
                        false,
                        false
                    );
                } else if (event.initKeyEvent) {
                    event.initKeyEvent(
                        eventType,
                        true,
                        true,
                        window,
                        false,
                        false,
                        false,
                        false,
                        keyCode,
                        0
                    );
                }

                // 尝试设置keyCode
                try {
                    Object.defineProperty(event, 'keyCode', { value: keyCode });
                    Object.defineProperty(event, 'which', { value: keyCode });
                } catch (e) {
                    // 忽略错误
                }

                // 分发事件
                document.dispatchEvent(event);

                if (this.config.debug) {
                    console.log('使用旧版方法触发键盘事件: ' + eventType + ', keyCode: ' + keyCode);
                }
            } else {
                // 如果createEvent不可用，尝试使用jQuery或其他方法
                console.warn('不支持的事件创建方法');
            }
        } catch (e) {
            console.error('触发键盘事件失败:', e);
        }
    },

    // 获取键码对应的字符串
    getKeyString: function(keyCode) {
        switch (keyCode) {
            case 37: return 'ArrowLeft';
            case 38: return 'ArrowUp';
            case 39: return 'ArrowRight';
            case 40: return 'ArrowDown';
            default: return '';
        }
    },

    // 获取键码对应的代码字符串
    getKeyCodeString: function(keyCode) {
        switch (keyCode) {
            case 37: return 'ArrowLeft';
            case 38: return 'ArrowUp';
            case 39: return 'ArrowRight';
            case 40: return 'ArrowDown';
            default: return '';
        }
    },
    // 检查GEMIOLI游戏引擎是否已加载，并尝试直接注入控制
    checkGameEngine: function() {
        if (typeof GEMIOLI === 'undefined' || !GEMIOLI.Application) {
            console.log('GEMIOLI游戏引擎尚未加载，将在引擎加载后注入控制');

            // 设置一个定时器，等待游戏引擎加载
            var self = this;
            setTimeout(function() {
                self.checkGameEngine();
            }, 1000);
            return;
        }

        console.log('GEMIOLI游戏引擎已加载，注入触摸控制');

        // 尝试直接修改游戏引擎的键盘事件处理
        if (typeof GEMIOLI.Application.onKeyDown === 'function') {
            console.log('找到GEMIOLI.Application.onKeyDown方法');

            // 保存原始的onKeyDown方法
            const originalOnKeyDown = GEMIOLI.Application.onKeyDown;

            // 替换为我们的方法
            GEMIOLI.Application.onKeyDown = function(event) {
                // 调用原始方法
                originalOnKeyDown.call(GEMIOLI.Application, event);

                // 记录按键状态
                if (event.keyCode >= 37 && event.keyCode <= 40) {
                    if (TouchControls.config.debug) {
                        console.log(`游戏引擎处理按键: ${event.keyCode}`);
                    }
                }
            };
        }

        if (typeof GEMIOLI.Application.onKeyUp === 'function') {
            console.log('找到GEMIOLI.Application.onKeyUp方法');

            // 保存原始的onKeyUp方法
            const originalOnKeyUp = GEMIOLI.Application.onKeyUp;

            // 替换为我们的方法
            GEMIOLI.Application.onKeyUp = function(event) {
                // 调用原始方法
                originalOnKeyUp.call(GEMIOLI.Application, event);

                // 记录按键状态
                if (event.keyCode >= 37 && event.keyCode <= 40) {
                    if (TouchControls.config.debug) {
                        console.log(`游戏引擎处理按键释放: ${event.keyCode}`);
                    }
                }
            };
        }
    }
};

// 在页面加载完成后初始化触摸控制
window.addEventListener('DOMContentLoaded', function() {
    TouchControls.init();

    // 等待游戏引擎加载
    setTimeout(() => {
        TouchControls.checkGameEngine();
    }, 2000);
});

// 添加全局调试开关
window.toggleTouchControlsDebug = function() {
    TouchControls.config.debug = !TouchControls.config.debug;
    console.log(`触摸控制调试模式: ${TouchControls.config.debug ? '开启' : '关闭'}`);
    return TouchControls.config.debug;
};

// 添加全局显示/隐藏开关
window.toggleTouchControls = function() {
    const controls = document.getElementById('touch-controls');
    if (controls) {
        if (controls.style.display === 'none') {
            controls.style.display = 'block';
            console.log('显示触摸控制');
            return true;
        } else {
            controls.style.display = 'none';
            console.log('隐藏触摸控制');
            return false;
        }
    }
    return false;
};
