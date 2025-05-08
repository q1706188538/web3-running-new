/**
 * 游戏开始按钮拦截器
 * 用于拦截游戏开始按钮的点击事件，显示确认对话框
 */
(function() {
    // 每次游戏需要扣除的金币数量（从GameConfig中获取）
    const COINS_COST = typeof GameConfig !== 'undefined' ? GameConfig.GAME_START_COST : 10;

    // 保存原始的点击事件处理函数
    let originalClickHandler = null;

    // 初始化拦截器
    window.addEventListener('load', function() {
        console.log('游戏开始按钮拦截器初始化...');

        // 创建确认对话框
        createConfirmationDialog();

        // 在控制台中输出GEMIOLI.Menu.play对象的属性，以便更好地了解如何拦截它
        console.log('GEMIOLI.Menu.play对象:', GEMIOLI.Menu.play);

        // 设置定时器，等待游戏引擎完全加载完成
        setTimeout(function() {
            // 检查GEMIOLI对象和Menu.play是否已加载
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Menu && GEMIOLI.Menu.play) {
                console.log('检测到游戏开始按钮，准备拦截...');

                // 直接修改GEMIOLI.Button.prototype.dispatchEvent方法
                if (GEMIOLI.Button && GEMIOLI.Button.prototype && GEMIOLI.Button.prototype.dispatchEvent) {
                    console.log('拦截GEMIOLI.Button.prototype.dispatchEvent方法');

                    // 保存原始的dispatchEvent方法
                    const originalDispatchEvent = GEMIOLI.Button.prototype.dispatchEvent;

                    // 替换为我们的方法
                    GEMIOLI.Button.prototype.dispatchEvent = function(event) {
                        // 如果是play按钮的click事件，拦截并显示确认对话框
                        if (this === GEMIOLI.Menu.play && event.type === 'click') {
                            console.log('拦截到play按钮的click事件');

                            // 显示确认对话框
                            showConfirmation();

                            // 保存原始的dispatchEvent方法和事件，以便在确认后调用
                            originalClickHandler = {
                                method: originalDispatchEvent,
                                context: this,
                                event: event
                            };

                            return;
                        }

                        // 其他事件正常分发
                        return originalDispatchEvent.call(this, event);
                    };

                    console.log('已成功拦截GEMIOLI.Button.prototype.dispatchEvent方法');
                } else {
                    console.warn('未找到GEMIOLI.Button.prototype.dispatchEvent方法，尝试其他方法');

                    // 尝试直接修改GEMIOLI.Menu.play对象
                    if (GEMIOLI.Menu.play.dispatchEvent) {
                        console.log('拦截GEMIOLI.Menu.play.dispatchEvent方法');

                        // 保存原始的dispatchEvent方法
                        const originalDispatchEvent = GEMIOLI.Menu.play.dispatchEvent;

                        // 替换为我们的方法
                        GEMIOLI.Menu.play.dispatchEvent = function(event) {
                            // 如果是click事件，拦截并显示确认对话框
                            if (event.type === 'click') {
                                console.log('拦截到play按钮的click事件');

                                // 显示确认对话框
                                showConfirmation();

                                // 保存原始的dispatchEvent方法和事件，以便在确认后调用
                                originalClickHandler = {
                                    method: originalDispatchEvent,
                                    context: this,
                                    event: event
                                };

                                return;
                            }

                            // 其他事件正常分发
                            return originalDispatchEvent.call(this, event);
                        };

                        console.log('已成功拦截GEMIOLI.Menu.play.dispatchEvent方法');
                    } else {
                        console.warn('未找到GEMIOLI.Menu.play.dispatchEvent方法，尝试其他方法');

                        // 尝试直接修改GEMIOLI.Menu.play对象的_listeners属性
                        if (GEMIOLI.Menu.play._listeners && GEMIOLI.Menu.play._listeners.click) {
                            console.log('拦截GEMIOLI.Menu.play._listeners.click');

                            // 保存原始的click事件监听器
                            originalClickHandler = {
                                listeners: GEMIOLI.Menu.play._listeners.click.slice()
                            };

                            // 清除原始的click事件监听器
                            GEMIOLI.Menu.play._listeners.click = [];

                            // 添加新的click事件监听器
                            GEMIOLI.Menu.play.addEventListener('click', function() {
                                console.log('拦截到play按钮的click事件');

                                // 显示确认对话框
                                showConfirmation();
                            });

                            console.log('已成功拦截GEMIOLI.Menu.play._listeners.click');
                        } else {
                            console.warn('未找到GEMIOLI.Menu.play._listeners.click，无法拦截');
                        }
                    }
                }
            } else {
                console.warn('GEMIOLI.Menu.play不存在，无法拦截');
            }
        }, 2000); // 等待2秒，确保游戏引擎完全加载完成
    });

    // 创建确认对话框
    function createConfirmationDialog() {
        // 检查是否已存在确认对话框
        if (document.getElementById('game-start-confirmation')) {
            return;
        }

        // 创建确认对话框元素
        const dialog = document.createElement('div');
        dialog.id = 'game-start-confirmation';
        dialog.style.display = 'none';
        dialog.style.position = 'fixed';
        dialog.style.top = '0';
        dialog.style.left = '0';
        dialog.style.width = '100%';
        dialog.style.height = '100%';
        dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        dialog.style.zIndex = '9999';
        dialog.style.display = 'none';
        dialog.style.justifyContent = 'center';
        dialog.style.alignItems = 'center';

        // 创建对话框内容
        const content = document.createElement('div');
        content.style.backgroundColor = '#fff';
        content.style.padding = '20px';
        content.style.borderRadius = '10px';
        content.style.maxWidth = '80%';
        content.style.textAlign = 'center';

        // 创建消息文本
        const message = document.createElement('p');
        message.id = 'game-start-message';
        message.textContent = '本次游戏将扣除金币，是否继续？';
        message.style.fontSize = '18px';
        message.style.marginBottom = '20px';

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';

        // 创建确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认开始';
        confirmButton.style.padding = '10px 20px';
        confirmButton.style.backgroundColor = '#4CAF50';
        confirmButton.style.color = 'white';
        confirmButton.style.border = 'none';
        confirmButton.style.borderRadius = '5px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.onclick = onConfirm;

        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.backgroundColor = '#f44336';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = onCancel;

        // 组装对话框
        buttonContainer.appendChild(confirmButton);
        buttonContainer.appendChild(cancelButton);
        content.appendChild(message);
        content.appendChild(buttonContainer);
        dialog.appendChild(content);

        // 添加到文档
        document.body.appendChild(dialog);

        console.log('已创建游戏开始确认对话框');
    }



    // 显示确认对话框
    async function showConfirmation() {
        try {
            // 显示对话框（先显示，再更新内容，避免闪烁）
            const dialog = document.getElementById('game-start-confirmation');
            if (dialog) {
                dialog.style.display = 'flex';
            }

            // 获取确认按钮
            const confirmButton = document.querySelector('#game-start-confirmation button:first-child');
            const message = document.getElementById('game-start-message');

            // 先显示加载中的消息
            if (message) {
                message.textContent = '正在获取金币余额...';
            }

            // 禁用确认按钮，直到获取到金币余额
            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }

            // 检查钱包和API是否可用
            if (typeof WalletManager === 'undefined' || !WalletManager.isConnected() || typeof ApiService === 'undefined') {
                if (message) {
                    message.textContent = '无法连接到钱包或API服务，请确保已连接钱包并刷新页面。';
                }
                console.error('钱包或API服务不可用');

                // 隐藏确认按钮
                if (confirmButton) {
                    confirmButton.style.display = 'none';
                }

                return;
            }

            // 从API获取最新的金币余额
            let currentCoins = 0;
            try {
                const walletAddress = WalletManager.getAccount();
                console.log('从API获取最新金币余额...');
                currentCoins = await ApiService.getCoins(walletAddress);
                console.log('当前金币余额:', currentCoins);
            } catch (error) {
                console.error('获取金币余额时出错:', error);

                // 显示错误消息
                if (message) {
                    message.textContent = '获取金币余额时出错，请稍后重试。';
                }

                // 隐藏确认按钮
                if (confirmButton) {
                    confirmButton.style.display = 'none';
                }

                return;
            }

            // 更新消息
            if (message) {
                message.textContent = `本次游戏将扣除 ${COINS_COST} 金币，当前余额: ${currentCoins} 金币，是否继续？`;

                // 如果金币不足，显示提示
                if (currentCoins < COINS_COST) {
                    message.textContent = `金币不足！本次游戏需要 ${COINS_COST} 金币，当前余额: ${currentCoins} 金币。`;

                    // 隐藏确认按钮
                    if (confirmButton) {
                        confirmButton.style.display = 'none';
                    }
                } else {
                    // 显示确认按钮
                    if (confirmButton) {
                        confirmButton.style.display = 'inline-block';
                        confirmButton.disabled = false;
                        confirmButton.style.opacity = '1';
                        confirmButton.style.cursor = 'pointer';
                    }
                }
            }
        } catch (error) {
            console.error('显示确认对话框时出错:', error);

            // 显示错误消息
            const message = document.getElementById('game-start-message');
            if (message) {
                message.textContent = '显示确认对话框时出错，请稍后重试。';
            }

            // 隐藏确认按钮
            const confirmButton = document.querySelector('#game-start-confirmation button:first-child');
            if (confirmButton) {
                confirmButton.style.display = 'none';
            }
        }
    }

    // 确认按钮点击事件
    async function onConfirm() {
        try {
            console.log('确认开始游戏');

            // 禁用确认按钮，防止重复点击
            const confirmButton = document.querySelector('#game-start-confirmation button:first-child');
            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
            }

            // 检查钱包和API是否可用
            if (typeof WalletManager === 'undefined' || !WalletManager.isConnected() || typeof ApiService === 'undefined') {
                alert('无法连接到钱包或API服务，请确保已连接钱包并刷新页面。');
                hideConfirmation();

                // 恢复确认按钮
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.style.opacity = '1';
                    confirmButton.style.cursor = 'pointer';
                }

                return;
            }

            // 从API获取最新的金币余额
            let currentCoins = 0;
            try {
                const walletAddress = WalletManager.getAccount();
                console.log('从API获取最新金币余额...');
                currentCoins = await ApiService.getCoins(walletAddress);
                console.log('当前金币余额:', currentCoins);
            } catch (error) {
                console.error('获取金币余额时出错:', error);
                alert('获取金币余额时出错，请稍后重试。');
                hideConfirmation();

                // 恢复确认按钮
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.style.opacity = '1';
                    confirmButton.style.cursor = 'pointer';
                }

                return;
            }

            // 检查金币是否足够
            if (currentCoins < COINS_COST) {
                alert('金币不足，无法开始游戏！');
                hideConfirmation();

                // 恢复确认按钮
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.style.opacity = '1';
                    confirmButton.style.cursor = 'pointer';
                }

                return;
            }

            // 通过API扣除金币
            try {
                const walletAddress = WalletManager.getAccount();
                console.log('通过API扣除金币:', COINS_COST);
                const newCoins = await ApiService.updateCoins(walletAddress, COINS_COST, 'subtract', 'play');
                console.log('扣除后的金币余额:', newCoins);
            } catch (error) {
                console.error('扣除金币时出错:', error);
                alert('扣除金币时出错，请稍后重试。');
                hideConfirmation();

                // 恢复确认按钮
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.style.opacity = '1';
                    confirmButton.style.cursor = 'pointer';
                }

                return;
            }

            // 隐藏对话框
            hideConfirmation();

            // 更新游戏状态面板
            if (typeof GameStatusPanel !== 'undefined' && GameStatusPanel.updatePanel) {
                GameStatusPanel.updatePanel();
            }

                    // 调用原始的点击事件处理函数
            if (originalClickHandler) {
                console.log('调用原始的点击事件处理函数');

                if (originalClickHandler.method && originalClickHandler.context && originalClickHandler.event) {
                    // 如果有方法、上下文和事件，调用原始方法
                    console.log('调用原始的dispatchEvent方法');
                    originalClickHandler.method.call(originalClickHandler.context, originalClickHandler.event);
                } else if (originalClickHandler.listeners && originalClickHandler.listeners.length > 0) {
                    // 如果是监听器数组，恢复原始的监听器并触发点击事件
                    console.log('恢复原始的click事件监听器');
                    GEMIOLI.Menu.play._listeners.click = originalClickHandler.listeners;
                    GEMIOLI.Menu.play.dispatchEvent({type: 'click'});
                } else if (typeof originalClickHandler === 'function') {
                    // 如果是函数，直接调用
                    console.log('调用原始的函数');
                    originalClickHandler.call(GEMIOLI.Menu.play);
                }
            } else {
                console.warn('没有找到原始的点击事件处理函数，尝试直接触发点击事件');

                // 尝试直接触发点击事件
                if (GEMIOLI && GEMIOLI.Menu && GEMIOLI.Menu.play && typeof GEMIOLI.Menu.play.dispatchEvent === 'function') {
                    console.log('直接触发点击事件');
                    GEMIOLI.Menu.play.dispatchEvent({type: 'click'});
                } else {
                    console.error('无法触发点击事件，游戏无法开始');
                    alert('无法开始游戏，请刷新页面重试！');
                }
            }
        } catch (error) {
            console.error('确认开始游戏时出错:', error);
            alert('开始游戏时出错，请重试！');

            // 重新拦截游戏开始按钮的点击事件
            setTimeout(function() {
                interceptPlayButton();
            }, 1000);
        }
    }

    // 取消按钮点击事件
    function onCancel() {
        console.log('取消开始游戏');

        // 隐藏对话框
        hideConfirmation();

        // 确保游戏开始按钮仍然被拦截
        setTimeout(function() {
            interceptPlayButton();
        }, 500);
    }

    // 隐藏确认对话框
    function hideConfirmation() {
        const dialog = document.getElementById('game-start-confirmation');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }


})();
