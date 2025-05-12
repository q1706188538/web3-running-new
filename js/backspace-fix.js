/**
 * 退格键修复
 * 用于修复游戏中退格键被禁用的问题
 */
(function() {
    console.log('初始化退格键修复...');

    // 保存原始的onkeydown处理函数
    const originalOnKeyDown = window.onkeydown;

    // 替换为我们的处理函数
    window.onkeydown = function(event) {
        // 检查事件目标是否是输入框或文本区域
        const isInputField = event.target.tagName === 'INPUT' ||
                             event.target.tagName === 'TEXTAREA' ||
                             event.target.isContentEditable;

        // 如果是输入框中的退格键或删除键，不阻止默认行为
        if (isInputField && (event.key === 'Backspace' || event.key === 'Delete')) {
            console.log('允许输入框中的退格键/删除键');
            return true; // 允许默认行为
        }

        // 对于其他情况，调用原始处理函数
        if (typeof originalOnKeyDown === 'function') {
            return originalOnKeyDown.call(this, event);
        }
    };

    // 监听动态添加的输入框
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];

                    // 检查是否是元素节点
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否是输入框
                        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                            enableBackspaceForElement(node);
                        }

                        // 检查子元素
                        const inputs = node.querySelectorAll('input, textarea');
                        inputs.forEach(enableBackspaceForElement);
                    }
                }
            }
        });
    });

    // 为输入框启用退格键
    function enableBackspaceForElement(element) {
        // 添加keydown事件监听器，确保退格键可用
        element.addEventListener('keydown', function(event) {
            if (event.key === 'Backspace' || event.key === 'Delete') {
                // 阻止事件冒泡，防止被全局处理器捕获
                event.stopPropagation();
            }
        }, true); // 使用捕获阶段
    }

    // 启动观察器
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 为现有的输入框启用退格键
    document.querySelectorAll('input, textarea').forEach(enableBackspaceForElement);

    console.log('退格键修复已应用');
})();
