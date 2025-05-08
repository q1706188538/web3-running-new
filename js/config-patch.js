/**
 * 配置补丁
 * 用于禁用不必要的配置请求
 */
(function() {
    // 在页面加载完成后应用补丁
    window.addEventListener('DOMContentLoaded', function() {
        console.log('应用配置补丁，禁用外部配置请求');

        // 覆盖原始的callConfigar函数
        if (window._ && typeof window._.callConfigar === 'function') {
            window._.callConfigar = function(t, e) {
                // 直接返回404，使用默认配置
                console.log('配置请求已禁用，使用默认配置');
                if (typeof e === 'function') {
                    e(404, null);
                }
            };
            console.log('成功应用配置补丁');
        } else {
            console.log('无法应用配置补丁，未找到目标函数');

            // 尝试在全局对象中查找
            for (var key in window) {
                if (window[key] && typeof window[key] === 'object' && typeof window[key].callConfigar === 'function') {
                    console.log('在 window.' + key + ' 中找到 callConfigar 函数');
                    window[key].callConfigar = function(t, e) {
                        console.log('配置请求已禁用，使用默认配置');
                        if (typeof e === 'function') {
                            e(404, null);
                        }
                    };
                    console.log('成功应用配置补丁到 window.' + key + '.callConfigar');
                }
            }
        }
    });

    // 拦截XMLHttpRequest，阻止特定请求
    (function() {
        // 保存原始的XMLHttpRequest.open方法
        var originalOpen = XMLHttpRequest.prototype.open;

        // 覆盖open方法
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            let modifiedUrl = url;

            // 检查URL是否包含configs路径
            if (typeof url === 'string' && url.indexOf('/configs/') !== -1) {
                console.log('拦截配置请求:', url);

                // 创建一个不存在的本地路径，而不是使用about:blank
                if (url.includes('/')) {
                    // 提取文件名
                    const parts = url.split('/');
                    const fileName = parts[parts.length - 1];
                    modifiedUrl = '/configs-disabled/' + fileName;
                } else {
                    modifiedUrl = '/configs-disabled/config.json';
                }

                console.log('重定向到:', modifiedUrl);
            }

            // 调用原始方法，使用修改后的URL
            return originalOpen.call(this, method, modifiedUrl, async, user, password);
        };

        console.log('已安装XMLHttpRequest拦截器');
    })();
})();
