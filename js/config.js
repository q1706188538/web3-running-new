/**
 * 全局配置文件
 * 根据不同环境自动选择合适的配置
 */
const Config = {
    // 当前环境
    ENV: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'development'
        : 'production',

    // API配置
    API: {
        // 开发环境配置
        development: {
            // 自动检测API端点
            detectEndpoint: true,
            // 可能的API端点列表（按优先级排序）
            possibleEndpoints: [
                '/api',                    // 通过前端服务器访问（相对路径）
                'http://localhost:9000/api', // 直接访问后端（9000端口）
                'http://127.0.0.1:9000/api'  // 直接访问后端（IP地址）
            ],
            // 基础URL（如果detectEndpoint为false，则使用此URL）
            baseUrl: '/api',
            // 超时时间（毫秒）
            timeout: 5000
        },
        // 生产环境配置
        production: {
            // 生产环境也可以检测端点
            detectEndpoint: true,
            // 生产环境可能的API端点
            possibleEndpoints: [
                '/api',                      // 通过代理访问（相对路径）
                window.location.origin + '/api' // 使用当前域名
            ],
            // 基础URL（如果detectEndpoint为false，则使用此URL）
            baseUrl: '/api',
            // 超时时间（毫秒）
            timeout: 10000
        }
    },

    // 获取当前环境的API配置
    getApiConfig: function() {
        return this.API[this.ENV];
    },

    // 检测可用的API端点
    detectApiEndpoint: async function() {
        const config = this.getApiConfig();

        // 如果不需要检测端点，直接返回配置的baseUrl
        if (!config.detectEndpoint) {
            console.log('不检测API端点，使用配置的baseUrl:', config.baseUrl);
            return config.baseUrl;
        }

        console.log('开始检测API端点...');

        // 尝试每个可能的端点
        for (const endpoint of config.possibleEndpoints) {
            // 根据端点类型构建健康检查URL
            let healthUrl;
            let apiEndpoint;

            if (endpoint.includes('/api')) {
                // 常规API端点
                healthUrl = endpoint.replace('/api', '/health');
                apiEndpoint = endpoint;
            } else {
                // 其他端点
                healthUrl = endpoint;
                apiEndpoint = endpoint;
            }

            console.log(`尝试连接到 ${healthUrl}`);

            try {
                // 设置超时
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(healthUrl, {
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache'
                    },
                    // 添加错误处理
                    mode: 'cors',
                    credentials: 'same-origin'
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log(`成功连接到健康检查端点: ${healthUrl}`);

                    // 尝试解析响应
                    try {
                        const data = await response.json();
                        console.log('健康检查响应:', data);

                        // 检查健康检查响应
                        if (data && data.status === 'ok') {
                            console.log('健康检查成功，使用端点:', apiEndpoint);

                            // 如果响应包含gameServerAddress，记录它
                            if (data.gameServerAddress) {
                                console.log('游戏服务器地址:', data.gameServerAddress);
                            }

                            return apiEndpoint;
                        } else {
                            console.warn('健康检查返回非成功状态，尝试下一个端点');
                            continue;
                        }
                    } catch (parseError) {
                        console.warn('无法解析健康检查响应:', parseError.message);
                    }

                    return apiEndpoint;
                } else {
                    console.warn(`端点 ${healthUrl} 返回非成功状态码:`, response.status);
                }
            } catch (error) {
                console.warn(`端点 ${healthUrl} 连接失败:`, error.message);
            }
        }

        // 如果所有端点都失败，返回默认的相对路径
        console.warn('所有API端点检测失败，使用默认相对路径: /api');
        return '/api';
    },

    // 标记初始化状态
    initialized: false,

    // 检查ApiService对象的完整性
    checkApiServiceIntegrity: function() {
        console.log('检查ApiService对象的完整性...');

        // 如果ApiService对象不存在，返回false
        if (typeof window.ApiService === 'undefined') {
            console.error('ApiService对象未定义');
            return false;
        }

        // 检查必要的方法
        const requiredMethods = [
            'setBaseUrl',
            'buildApiUrl',
            'testConnection',
            'getUserData',
            'verifyGameData'
        ];

        // 记录ApiService对象上的所有方法
        const availableMethods = Object.keys(window.ApiService);
        console.log('ApiService对象上的所有方法:', availableMethods.join(', '));

        // 检查是否缺少任何必要的方法
        const missingMethods = requiredMethods.filter(method =>
            typeof window.ApiService[method] !== 'function'
        );

        if (missingMethods.length > 0) {
            console.error('ApiService对象缺少以下必要方法:', missingMethods.join(', '));
            return false;
        }

        console.log('ApiService对象完整性检查通过');
        return true;
    },

    // 尝试加载或重新加载ApiService
    loadApiService: async function() {
        return new Promise((resolve, reject) => {
            console.log('尝试加载或重新加载ApiService...');

            // 创建script元素
            const script = document.createElement('script');
            script.src = './js/api-service.js';
            script.type = 'text/javascript';

            // 设置加载成功回调
            script.onload = () => {
                console.log('api-service.js加载成功');

                // 检查ApiService对象是否存在
                if (typeof window.ApiService !== 'undefined') {
                    console.log('ApiService对象已加载');

                    // 检查ApiService对象的完整性
                    const isIntact = this.checkApiServiceIntegrity();
                    resolve(isIntact);
                } else {
                    console.error('api-service.js加载成功，但ApiService对象未定义');
                    reject(new Error('ApiService对象未定义'));
                }
            };

            // 设置加载失败回调
            script.onerror = (error) => {
                console.error('加载api-service.js失败:', error);
                reject(new Error('加载api-service.js失败'));
            };

            // 添加到文档
            document.head.appendChild(script);
        });
    },

    // 初始化配置
    init: async function() {
        // 如果已经初始化，直接返回
        if (this.initialized) {
            console.log('Config已经初始化，跳过');
            return true;
        }

        console.log(`初始化配置，当前环境: ${this.ENV}`);

        try {
            // 检查ApiService对象的完整性
            let apiServiceIntact = this.checkApiServiceIntegrity();

            // 如果ApiService对象不完整，尝试加载或重新加载
            if (!apiServiceIntact) {
                console.warn('ApiService对象不完整，尝试重新加载...');
                try {
                    apiServiceIntact = await this.loadApiService();
                } catch (loadError) {
                    console.error('加载ApiService失败:', loadError);
                    // 继续执行，使用备用方法
                }
            }

            // 检测API端点并设置到ApiService
            if (window.ApiService && typeof ApiService.setBaseUrl === 'function') {
                const apiUrl = await this.detectApiEndpoint();
                ApiService.setBaseUrl(apiUrl);
                console.log('已设置API基础URL:', apiUrl);

                // 再次检查ApiService对象的完整性
                apiServiceIntact = this.checkApiServiceIntegrity();

                // 如果ApiService对象仍然不完整，记录错误但继续执行
                if (!apiServiceIntact) {
                    console.error('设置API基础URL后，ApiService对象仍然不完整');
                }

                // 测试API连接
                if (typeof ApiService.testConnection === 'function') {
                    let connected = false;
                    try {
                        connected = await ApiService.testConnection();
                        console.log('API连接测试结果:', connected ? '成功' : '失败');
                    } catch (testError) {
                        console.error('API连接测试出错:', testError);
                    }

                    // 如果连接失败，尝试其他端点
                    if (!connected && this.getApiConfig().detectEndpoint) {
                        console.warn('API连接测试失败，尝试其他端点...');

                        // 获取当前环境的可能端点
                        const endpoints = this.getApiConfig().possibleEndpoints;

                        // 过滤掉已经尝试过的端点
                        const remainingEndpoints = endpoints.filter(endpoint => endpoint !== apiUrl);

                        // 尝试其他端点
                        for (const endpoint of remainingEndpoints) {
                            console.log(`尝试备用端点: ${endpoint}`);
                            ApiService.setBaseUrl(endpoint);

                            try {
                                const retryConnected = await ApiService.testConnection();
                                if (retryConnected) {
                                    console.log(`成功连接到备用端点: ${endpoint}`);
                                    connected = true;
                                    break;
                                } else {
                                    console.warn(`备用端点 ${endpoint} 连接失败`);
                                }
                            } catch (retryError) {
                                console.error(`测试备用端点 ${endpoint} 时出错:`, retryError);
                            }
                        }
                    }

                    // 如果所有端点都连接失败，尝试使用fetch API直接测试
                    if (!connected) {
                        console.warn('所有API端点连接测试失败，尝试使用fetch API直接测试...');
                        try {
                            const response = await fetch('/health');
                            if (response.ok) {
                                console.log('使用fetch API测试成功');
                                connected = true;
                            } else {
                                console.warn('使用fetch API测试失败，状态码:', response.status);
                            }
                        } catch (fetchError) {
                            console.error('使用fetch API测试时出错:', fetchError);
                        }
                    }

                    // 设置WalletProgress.useApi
                    if (window.WalletProgress && typeof WalletProgress.setUseApi === 'function') {
                        console.log('设置WalletProgress.useApi =', connected);
                        WalletProgress.setUseApi(connected);
                    }
                }
            } else {
                console.error('ApiService对象未定义或setBaseUrl方法不可用');
            }

            // 标记为已初始化
            this.initialized = true;
            console.log('配置初始化完成');
            return true;
        } catch (error) {
            console.error('配置初始化出错:', error);
            return false;
        }
    },

    // 重新初始化配置
    reinit: async function() {
        console.log('重新初始化配置...');
        this.initialized = false;
        return this.init();
    }
};

// 不再在这里初始化配置，而是在index.html中初始化
// 这样可以避免重复初始化

// 导出配置对象
window.Config = Config;
