/**
 * 游戏状态UI - 使用GEMIOLI原生UI框架实现
 * 在游戏中显示实时的距离、金币和速度信息
 */
(function() {
    // 调试模式
    const DEBUG = true;

    // 测试API连接，不依赖ApiService对象
    function testApiConnection(callback) {
        console.log('测试API连接...');

        // 直接使用fetch测试API连接 (使用相对路径)
        fetch('/health') // 使用相对路径
        .then(response => {
            const connected = response.ok;
            console.log('API健康检查结果:', connected ? '成功' : '失败', '状态码:', response.status);

            if (callback && typeof callback === 'function') {
                callback(connected);
            }
        })
        .catch(error => {
            console.error('API健康检查请求失败:', error);

            if (callback && typeof callback === 'function') {
                callback(false);
            }
        });
    }

    // 在脚本开始时立即测试API连接
    testApiConnection();

    // 游戏状态UI对象
    const GameStateUI = {
        // 初始化状态
        initialized: false,

        // 用户数据刷新间隔（毫秒）
        refreshInterval: 5000,
        
        // 上次刷新时间
        lastRefreshTime: 0,
        
        // 存储用户数据
        userData: null,
        
        // 钱包地址
        walletAddress: null,

        // 初始化UI
        init: function() {
            if (this.initialized) {
                return;
            }

            if (DEBUG) console.log('初始化原生游戏状态UI...');

            // 确保GEMIOLI对象存在
            if (typeof GEMIOLI === 'undefined') {
                console.error('GEMIOLI未定义，延迟初始化...');
                // 延迟初始化
                setTimeout(this.init.bind(this), 1000);
                return;
            }

            // 确保API端点设置正确
            // 不再需要强制设置 baseUrl
            // if (window.ApiService && typeof window.ApiService.setBaseUrl === 'function') {
            //     // window.ApiService.setBaseUrl('http://localhost:9001'); // 移除强制设置
            //     // console.log('游戏UI已重新设置API端点为http://localhost:9001');
            // }

            // 修复字体渲染问题
            this.fixBMFontRendering();
            
            // 获取MetaMask钱包地址并从API获取用户数据
            this.fetchUserData();
            
            // 设置定时刷新
            this.setupRefreshTimer();

            // 标记为已初始化，防止重复执行
            this.initialized = true;

            // 准备UI原型方法
            this.prepareUIPrototype();

            // 应用UI到当前游戏
            this.applyUIToCurrentPlay();
        },

        // 获取钱包地址
        getWalletAddress: function() {
            // 首先尝试从WalletManager获取
            if (typeof WalletManager !== 'undefined' && WalletManager.getAccount) {
                this.walletAddress = WalletManager.getAccount();
                console.log('从WalletManager获取钱包地址:', this.walletAddress);
                if (this.walletAddress) {
                    return;
                }
            }
            
            // 如果WalletManager不可用，尝试直接从ethereum对象获取
            if (window.ethereum && window.ethereum.selectedAddress) {
                this.walletAddress = window.ethereum.selectedAddress;
                console.log('从ethereum对象获取钱包地址:', this.walletAddress);
                if (this.walletAddress) {
                    return;
                }
            }
            
            // 尝试从Web3TokenContract获取
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.userAddress) {
                this.walletAddress = Web3TokenContract.userAddress;
                console.log('从Web3TokenContract获取钱包地址:', this.walletAddress);
                if (this.walletAddress) {
                    return;
                }
            }
            
            // 尝试从provider获取
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.web3 && Web3TokenContract.web3.currentProvider) {
                if (Web3TokenContract.web3.currentProvider.selectedAddress) {
                    this.walletAddress = Web3TokenContract.web3.currentProvider.selectedAddress;
                    console.log('从web3.currentProvider.selectedAddress获取钱包地址:', this.walletAddress);
                    if (this.walletAddress) {
                        return;
                    }
                } else if (Web3TokenContract.web3.currentProvider.accounts && Web3TokenContract.web3.currentProvider.accounts.length > 0) {
                    this.walletAddress = Web3TokenContract.web3.currentProvider.accounts[0];
                    console.log('从web3.currentProvider.accounts获取钱包地址:', this.walletAddress);
                    if (this.walletAddress) {
                        return;
                    }
                }
            }
            
            // 尝试通过eth_accounts静默获取
            if (window.ethereum) {
                console.log('尝试通过eth_accounts静默获取钱包地址...');
                window.ethereum.request({ method: 'eth_accounts' })
                    .then(accounts => {
                        if (accounts && accounts.length > 0) {
                            this.walletAddress = accounts[0];
                            console.log('通过eth_accounts静默获取到钱包地址:', this.walletAddress);
                            // 立即刷新用户数据
                            this.fetchUserData();
                        } else {
                            console.log('eth_accounts未返回任何地址');
                            // 如果静默获取失败，尝试主动请求连接钱包
                            this.connectWallet();
                        }
                    })
                    .catch(err => {
                        console.error('通过eth_accounts获取钱包地址失败:', err);
                        // 如果静默获取失败，尝试主动请求连接钱包
                        this.connectWallet();
                    });
                return;
            }
            
            // 如果都不可用，尝试主动连接钱包
            this.connectWallet();
        },
        
        // 主动请求连接钱包
        connectWallet: function() {
            console.log('尝试主动连接钱包...');
            if (window.ethereum) {
                window.ethereum.request({ method: 'eth_requestAccounts' })
                    .then(accounts => {
                        if (accounts && accounts.length > 0) {
                            this.walletAddress = accounts[0];
                            console.log('成功连接钱包，地址:', this.walletAddress);
                            // 连接成功后刷新用户数据
                            this.fetchUserData();
                        } else {
                            console.error('连接钱包失败: 未返回账户');
                            this.showBrowserNotification('Please connect your wallet manually');
                        }
                    })
                    .catch(err => {
                        console.error('连接钱包请求被拒绝:', err);
                        this.showBrowserNotification('Please connect your wallet manually');
                    });
            } else {
                console.error('无法获取钱包地址，请确保已安装MetaMask或其他兼容钱包');
                this.walletAddress = null;
                this.showBrowserNotification('Please install MetaMask or other compatible wallet');
            }
        },
        
        // 从API获取用户数据
        fetchUserData: function() {
            // 如果没有钱包地址，先尝试获取
            if (!this.walletAddress) {
                this.getWalletAddress();
            }
            
            // 确保有钱包地址
            if (!this.walletAddress) {
                console.error('获取用户数据失败: 钱包地址为空，请确保已连接MetaMask钱包');
                this.showBrowserNotification('Please connect your MetaMask wallet');
                return;
            }

            // 使用 ApiService 构建 URL
            const apiUrl = ApiService.buildApiUrl(`/user/${this.walletAddress}`); // 使用 ApiService 构建
            console.log('获取用户数据URL:', apiUrl);

            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API请求失败: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('成功获取用户数据:', data);
                    this.userData = data;
                    this.lastRefreshTime = Date.now();
                    
                    // 更新UI显示
                    this.updateUIWithUserData();
                })
                .catch(error => {
                    console.error('获取用户数据时出错:', error);
                    this.showBrowserNotification('Failed to fetch user data');
                });
        },
        
        // 设置定时刷新
        setupRefreshTimer: function() {
            // 每5秒刷新一次数据
            setInterval(() => {
                this.fetchUserData();
            }, this.refreshInterval);
        },
        
        // 使用用户数据更新UI
        updateUIWithUserData: function(retryCount = 0) {
            if (!this.userData) {
                console.log('没有用户数据，无法更新UI');
                return;
            }
            
            // 直接获取GEMIOLI.Play实例
            if (!GEMIOLI || !GEMIOLI.Play) {
                console.log('GEMIOLI.Play不存在，无法更新UI');
                return;
            }
            
            const play = GEMIOLI.Play;
            
            // 检查UI元素是否已创建
            if (!play.stateTexts || play.stateTexts.length < 4) {
                console.log('UI元素不存在，无法更新UI');
                
                // 添加重试机制，最多重试3次
                if (retryCount < 3) {
                    console.log(`将在1秒后进行第${retryCount + 1}次重试...`);
                    setTimeout(() => {
                        this.updateUIWithUserData(retryCount + 1);
                    }, 1000);
                }
                return;
            }
            
            // 输出使用的是哪个实例
            console.log('正在使用的游戏实例: GEMIOLI.Play');
            
            // 获取用户数据
            const availableCoins = this.userData.coins || 0;        // 可用金币
            const totalCoins = this.userData.highScore || 0;        // 累计金币
            const highScore = this.userData.lastScore || 0;         // 最高得分
            const walletAddress = this.walletAddress || "0x...";    // 钱包地址
            
            // 格式化数据
            const formattedAvailableCoins = this.formatNumber(availableCoins);
            const formattedTotalCoins = this.formatNumber(totalCoins);
            const formattedHighScore = this.formatNumber(highScore);
            const formattedWalletAddress = this.formatWalletAddress(walletAddress);
            
            // 更新所有文本内容
            const values = [
                formattedAvailableCoins,  // 背景10：显示可用金币
                formattedTotalCoins,      // 背景8：显示累计金币
                formattedHighScore,       // 背景7：显示最高得分
                formattedWalletAddress    // 背景9：显示钱包地址
            ];
            
            // 更新每个文本
            for (let i = 0; i < play.stateTexts.length && i < values.length; i++) {
                play.stateTexts[i].text = values[i];
            }
            
            console.log('UI已更新:', values);
        },
        
        // 格式化数字（千位进1）
        formatNumber: function(number) {
            if (number >= 1000) {
                return (Math.floor(number / 100) / 10).toFixed(1) + "K";
            }
            return number.toString();
        },
        
        // 格式化钱包地址
        formatWalletAddress: function(address) {
            if (!address || address.length < 6) {
                return address;
            }
            return "0x..." + address.substring(address.length - 4);
        },
        
        // 查找当前游戏实例
        findCurrentPlay: function() {
            // 直接使用GEMIOLI.Play实例，因为之前的调试发现这是有效的实例
            if (GEMIOLI && GEMIOLI.Play && typeof GEMIOLI.Play === 'object') {
                return { instance: GEMIOLI.Play, source: 'GEMIOLI.Play' };
            }
            
            // 调试输出当前GEMIOLI状态
            console.log('GEMIOLI状态:', {
                hasGEMIOLI: !!GEMIOLI,
                hasPlay: !!(GEMIOLI && GEMIOLI.Play)
            });
            
            return null;
        },

        // 修复BMFont位图字体渲染问题
        fixBMFontRendering: function() {
            if (DEBUG) console.log('尝试修复BMFont渲染问题...');
            
            // 确保GEMIOLI和相关对象存在
            if (!GEMIOLI || !GEMIOLI.AtlasLoader || !GEMIOLI.FontLoader) {
                console.error('无法访问GEMIOLI字体加载器');
                return;
            }
            
            try {
                // 预加载play1.atlas以确保图集可用
                GEMIOLI.AtlasLoader.load("atlases/play1.atlas", function(atlas) {
                    // 预加载字体
                    GEMIOLI.FontLoader.loadFromAtlas("fonts/play1/text.fnt", "atlases/play1.atlas");
                });
            } catch (e) {
                console.error("修复字体渲染时出错:", e);
            }
        },

        // 准备UI原型方法
        prepareUIPrototype: function() {
            if (DEBUG) console.log('准备UI原型方法...');

            if (!GEMIOLI || !GEMIOLI.Play || typeof GEMIOLI.Play !== 'object') {
                console.error('GEMIOLI.Play 不是一个有效的对象实例，无法添加UI方法');
                return;
            }

            const playInstance = GEMIOLI.Play;

            // 为GEMIOLI.Play实例添加initStateUI方法 (如果不存在)
            if (typeof playInstance.initStateUI !== 'function') {
                playInstance.initStateUI = function() {
                if (this.stateContainer) {
                    return; // 已初始化，避免重复
                }

                if (DEBUG) console.log('执行initStateUI方法');
                var self = this;

                try {
                // ======= 创建状态UI面板 =======

                    // 获取游戏窗口尺寸
                    const gameWidth = GEMIOLI.Application.innerWidth;
                    const gameHeight = GEMIOLI.Application.innerHeight;
                    console.log("游戏渲染区域分辨率:", gameWidth + "x" + gameHeight);

                    console.log("准备创建主容器...");
                // 1. 创建主容器
                self.stateContainer = new GEMIOLI.DisplayObjectContainer();
                    console.log("主容器创建成功，准备添加到父容器...");
                self.addChild(self.stateContainer);
                    console.log("主容器已添加到父容器");
                    
                    console.log("准备创建多个背景和文本...");
                    
                    // 2. 创建多个背景和文本
                    try {
                        console.log("准备创建多个背景和文本...");
                        
                        // 定义背景配置
                        const backgrounds = [
                            { id: "10", label: "0", offsetY: 0 },    // 背景10：显示可用金币
                            { id: "8", label: "0", offsetY: 140 },   // 背景8：显示累计金币
                            { id: "7", label: "0", offsetY: 280 },   // 背景7：显示最高得分
                            { id: "9", label: "0", offsetY: 420 }    // 背景9：显示钱包地址
                        ];
                        
                        // 背景宽高
                        const bgWidth = 329;
                        const bgHeight = 139;
                        
                        // 创建背景容器，用于管理所有背景
                        self.stateBgContainer = new GEMIOLI.DisplayObjectContainer();
                        self.stateContainer.addChild(self.stateBgContainer);
                        
                        // 设置背景容器的位置
                        self.stateBgContainer.x = -185;
                        self.stateBgContainer.y = 139;
                        
                        // 确保atlas已加载
                        GEMIOLI.AtlasLoader.load("atlases/play1.atlas", function(atlas) {
                            // 创建所有背景和文本
                            self.stateBackgrounds = [];
                            self.stateTexts = [];
                            
                            backgrounds.forEach(function(bgConfig, index) {
                                // 为每个背景创建一个容器
                                const bgContainer = new GEMIOLI.DisplayObjectContainer();
                                bgContainer.y = bgConfig.offsetY;
                                self.stateBgContainer.addChild(bgContainer);
                                
                                // 创建背景
                                const bg = GEMIOLI.AtlasQuad.fromRect(0, 0, bgWidth, bgHeight, "atlases/play1.atlas", bgConfig.id);
                                bg.alpha = 0.8; // 调整透明度
                                bgContainer.addChild(bg);
                                
                                // 创建文本
                                const text = GEMIOLI.Text.fromAtlas(50, "fonts/play1/text.fnt", "atlases/play1.atlas", 
                                    GEMIOLI.Text.RIGHT_ALIGN, GEMIOLI.Text.RIGHT_ALIGN, GEMIOLI.Text.CENTER_ALIGN);
                                text.text = bgConfig.label;
                                
                                // 设置文本位置
                                text.x = bgWidth - 25; // 背景宽度减去边距
                                text.y = bgHeight / 2 -5; // 背景高度的一半，再往上移10像素
                                
                                bgContainer.addChild(text);
                                
                                // 保存引用以便后续更新
                                self.stateBackgrounds.push(bg);
                                self.stateTexts.push(text);
                                
                                console.log("创建了背景 " + bgConfig.id + " 和文本");
                            });
                            
                            // UI创建完成后立即更新数据
                            if (window.GameStateUI) {
                                console.log('UI创建完成，准备更新数据...');
                                window.GameStateUI.updateUIWithUserData();
                            }
                        });
                        
                    } catch (bgError) {
                        console.error("创建背景和文本时出错:", bgError);
                    }
                    
                    // 设置整体状态UI位置
                    console.log("设置UI位置...");
                    self.stateContainer.x = 200;
                    self.stateContainer.y = 150;
                    console.log('整体UI位置: x=' + self.stateContainer.x + ', y=' + self.stateContainer.y);

                } catch(e) {
                    console.error('初始化UI时出错:', e);
                }
                };
                if (DEBUG) console.log('initStateUI 方法已直接添加到 GEMIOLI.Play 实例');
            }

            // 为GEMIOLI.Play实例添加showStateUI方法 (如果不存在)
            if (typeof playInstance.showStateUI !== 'function') {
                playInstance.showStateUI = function() {
                try {
                    if (this.stateContainer) {
                        this.stateContainer.visible = true;
                    } else {
                        this.initStateUI();
                    }
                } catch(e) {
                    console.error('显示UI时出错:', e);
                }
                };
                if (DEBUG) console.log('showStateUI 方法已直接添加到 GEMIOLI.Play 实例');
            }

            // 修改Play实例的update方法 (如果存在且未被修改过)
            if (typeof playInstance.update === 'function' && !playInstance._updatePatchedByGameStateUI) {
                var originalUpdate = playInstance.update;
                playInstance.update = function(dt) {
                    // 调用原始update方法
                    originalUpdate.apply(this, arguments);

                    // 启用状态UI更新
                    if (window.GameStateUI && Date.now() - window.GameStateUI.lastRefreshTime > 10000) {
                        // 如果超过10秒没有刷新，则刷新数据
                        window.GameStateUI.fetchUserData();
                    }
                };
                playInstance._updatePatchedByGameStateUI = true; // 标记已修改
                if (DEBUG) console.log('update 方法已在 GEMIOLI.Play 实例上被增强');
            }

            // 不再需要静态的 GEMIOLI.Play.showStateUI，因为我们会直接在实例上调用

            // 修改Play实例的prepend方法 (如果存在且未被修改过)
            if (typeof playInstance.prepend === 'function' && !playInstance._prependPatchedByGameStateUI) {
            var originalPrepend = playInstance.prepend;
            playInstance.prepend = function() {
                    try {
                // 先调用原始的prepend方法
                originalPrepend.apply(this, arguments);

                        // 延迟初始化UI
                var self = this;
                        setTimeout(function() {
                            try {
                        self.initStateUI();
                            } catch(e) {
                                console.error('延迟初始化UI时出错:', e);
                            }
                        }, 1000);
                    } catch(e) {
                        console.error('prepend方法执行出错:', e);
                        // 仍然尝试初始化
                        this.initStateUI(); // this 指向 playInstance
                    }
                };
                playInstance._prependPatchedByGameStateUI = true; // 标记已修改
                if (DEBUG) console.log('prepend 方法已在 GEMIOLI.Play 实例上被增强');
            }

            if (DEBUG) console.log('UI 方法已准备并直接应用到 GEMIOLI.Play 实例');
        },

        // 在当前Play实例上应用UI
        applyUIToCurrentPlay: function(retryCount = 0) {
            console.log('应用UI到当前游戏...');
            
            // 直接使用GEMIOLI.Play实例
            if (!GEMIOLI || !GEMIOLI.Play) {
                console.error('GEMIOLI.Play不存在，无法应用UI');
                
                // 如果没有找到GEMIOLI.Play实例，尝试重试
                if (retryCount < 3) {
                    console.log(`将在2秒后进行第${retryCount + 1}次尝试应用UI...`);
                    setTimeout(() => {
                        this.applyUIToCurrentPlay(retryCount + 1);
                    }, 2000);
                } else {
                    console.error('多次尝试应用UI失败，请检查游戏初始化状态');
                }
                return;
            }

            // 调用实例的initStateUI方法
            const play = GEMIOLI.Play;
            
            if (typeof play.initStateUI === 'function') {
                try {
                play.initStateUI();
                    console.log('UI初始化成功应用到游戏实例');
                } catch(e) {
                    console.error('初始化UI时出错:', e);
                }
            } else {
                console.error('GEMIOLI.Play实例没有initStateUI方法');
                
                // 如果没有initStateUI方法，尝试添加
                this.tryFixPlayInstance();
            }
        },
        
        // 尝试修复Play实例
        tryFixPlayInstance: function() {
            console.log('尝试修复Play实例...');
            
            // 检查GEMIOLI是否存在
            if (!GEMIOLI) {
                console.error('GEMIOLI对象不存在，无法修复');
                return;
            }
            
            // 尝试直接访问GEMIOLI.Play
            if (GEMIOLI.Play) {
                console.log('找到GEMIOLI.Play，尝试添加initStateUI方法');
                
                // 如果 GEMIOLI.Play 实例上没有 initStateUI，说明 prepareUIPrototype 未成功或未在其上正确设置
                // 直接调用 prepareUIPrototype，它现在会尝试在实例上定义方法
                if (typeof GEMIOLI.Play.initStateUI !== 'function') {
                    console.log('GEMIOLI.Play 实例上缺少 initStateUI，调用 prepareUIPrototype...');
                    this.prepareUIPrototype();
                }

                // 再次尝试应用UI，此时 prepareUIPrototype 应该已经在实例上添加了方法
                setTimeout(() => {
                    console.log('尝试修复后，再次应用UI...');
                    this.applyUIToCurrentPlay(0);
                }, 1000);
            }
        },
        
        // 直接加载图集（用于调试）
        directLoadAtlas: function() {
            console.log('手动加载图集...');
            GEMIOLI.AtlasLoader.load("atlases/play1.atlas", function(atlas) {
                console.log('图集加载成功:', atlas);
                // 预加载字体
                GEMIOLI.FontLoader.loadFromAtlas("fonts/play1/text.fnt", "atlases/play1.atlas");
                console.log('字体加载成功');
                
                // 刷新UI
                if (GEMIOLI && GEMIOLI.Play && typeof GEMIOLI.Play.initStateUI === 'function') {
                    console.log('重新初始化UI...');
                    GEMIOLI.Play.initStateUI();
                } else {
                    console.error('GEMIOLI.Play不存在或没有initStateUI方法');
                }
            });
        },

        // 使用指定地址获取数据（用于测试或强制刷新）
        fetchUserDataWithAddress: function(address) {
            if (!address) {
                console.error('获取用户数据失败: 提供的钱包地址为空');
                this.showBrowserNotification('Invalid wallet address');
                return;
            }

            // 使用 ApiService 构建 URL
            const apiUrl = ApiService.buildApiUrl(`/user/${address}`); // 使用 ApiService 构建
            console.log('使用指定地址获取用户数据URL:', apiUrl);

            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API请求失败: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('成功获取用户数据:', data);
                    this.userData = data;
                    this.lastRefreshTime = Date.now();
                    
                    // 临时保存当前地址
                    const originalAddress = this.walletAddress;
                    
                    // 设置新地址用于显示
                    this.walletAddress = address;
                    
                    // 更新UI显示
                    this.updateUIWithUserData();
                    
                    // 恢复原始地址
                    this.walletAddress = originalAddress;
                })
                .catch(error => {
                    console.error('获取用户数据时出错:', error);
                    this.showBrowserNotification('Failed to fetch user data');
                });
        },
        
        // 显示浏览器底部通知
        showBrowserNotification: function(message) {
            // 使用console.warn在控制台中显示更明显的警告
            console.warn('NOTIFICATION:', message);
            
            // 如果在开发环境中，可以考虑使用alert
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // 创建一个临时的通知元素
                const notification = document.createElement('div');
                notification.style.position = 'fixed';
                notification.style.bottom = '0';
                notification.style.left = '0';
                notification.style.right = '0';
                notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                notification.style.color = 'white';
                notification.style.padding = '10px';
                notification.style.textAlign = 'center';
                notification.style.zIndex = '9999';
                notification.style.fontFamily = 'Arial, sans-serif';
                notification.textContent = message;
                
                // 添加到文档中
                document.body.appendChild(notification);
                
                // 5秒后自动移除
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 5000);
            }
        }
    };

    // 初始化UI系统
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            GameStateUI.init();
        });
    } else {
        // 文档已加载完成，直接初始化
        GameStateUI.init();
    }

    // 防止游戏初始化时序问题，延迟再次检查
    setTimeout(function() {
        if (!GameStateUI.initialized) {
            console.log('延迟初始化GameStateUI');
            GameStateUI.init();
        }
    }, 2000);

    // 添加到全局对象
    window.GameStateUI = GameStateUI;

    // 提供一个手动初始化的全局方法
    window.initGameUI = function() {
        GameStateUI.initialized = false;
        GameStateUI.init();
        return '游戏UI初始化已触发';
    };

    // 提供一个使用指定地址刷新数据的全局方法
    window.refreshGameUIWithAddress = function(address) {
        if (!address) {
            console.error('请提供有效的钱包地址');
            if (GameStateUI) {
                GameStateUI.showBrowserNotification('Please provide a valid wallet address');
            }
            return false;
        }
        if (GameStateUI) {
            GameStateUI.fetchUserDataWithAddress(address);
            return true;
        }
        console.error('游戏UI未初始化');
        return false;
    };

    // 提供一个调试方法，显示当前游戏实例的详细信息
    window.debugGameInstance = function() {
        if (!GameStateUI) {
            console.error('GameStateUI未初始化');
            return '未找到GameStateUI对象';
        }
        
        if (!GEMIOLI || !GEMIOLI.Play) {
            console.error('未找到GEMIOLI.Play实例');
            return '未找到GEMIOLI.Play实例';
        }
        
        const play = GEMIOLI.Play;
        console.log('当前游戏实例: GEMIOLI.Play');
        console.log('当前游戏实例对象:', play);
        
        console.log('实例属性:');
        console.log('- stateContainer存在:', !!play.stateContainer);
        console.log('- stateTexts存在:', !!play.stateTexts);
        if (play.stateTexts) {
            console.log('- stateTexts长度:', play.stateTexts.length);
            play.stateTexts.forEach((text, index) => {
                console.log(`- stateTexts[${index}].text:`, text.text);
            });
        }
        
        return '游戏实例调试信息已输出到控制台';
    };
})();