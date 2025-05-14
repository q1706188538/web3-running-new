/**
 * 音频预加载器
 * 用于解决移动设备上音频加载问题
 */
const AudioPreloader = {
    // 音频文件列表
    audioFiles: [],

    // 已加载的音频
    loadedAudio: {},
    soundAtlasReady: false, // 新增标志位，指示 sound/sounds.js 是否已加载并处理完毕

    // 初始化
    init: async function() { // 改为 async 函数
        // console.log('初始化音频预加载器...');

        // 检测移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // 专门检测iOS设备
        this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        // 根据设备类型选择音频文件
        this.selectAudioFiles();

        // 创建音频上下文 (对移动和桌面都适用)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!this.audioContext) {
            console.error("Web Audio API is not supported in this browser.");
            // 可以考虑在此处返回或抛出错误，因为音频将无法工作
        } else {
            // console.log('AudioContext created successfully.');
        }

        // 在移动设备上使用特殊处理 (setupMobileAudio 会调用 replaceSoundLoader)
        if (this.isMobile) {
            // console.log('检测到移动设备，使用特殊音频处理');
            // setupMobileAudio 现在只需要负责移动设备特有的逻辑（如果还有的话）
            // 主要是预加载和替换加载器，这些现在在外面处理或对两者都处理
            this.preloadAudioFiles(); // 移动端预加载
            this.replaceSoundLoader(); // 移动端替换加载器
        } else {
            // console.log('检测到非移动设备 (PC)，执行标准音频处理');
            // 非移动设备也需要预加载音频并替换加载器
            this.preloadAudioFiles(); // PC 端预加载
            // 确保 SoundLoader 被替换
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.SoundLoader && GEMIOLI.SoundLoader.loadAtlas) {
                this.replaceSoundLoader(); // PC 端替换加载器
            } else {
                // 如果 GEMIOLI 或 SoundLoader 尚未加载，replaceSoundLoader 内部有机制稍后重试
                this.replaceSoundLoader();
            }
        }

        // 确保 sound atlas (sounds.js) 被加载
        // 我们需要 GEMIOLI.SoundLoader.loadAtlas 已经被我们的 shim 替换
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.SoundLoader && typeof GEMIOLI.SoundLoader.loadAtlas === 'function') {
            // console.log('AudioPreloader.init: 主动加载 sound atlas (sounds.js)...');
            try {
                // loadAtlas 现在返回一个 Promise
                await new Promise((resolve, reject) => {
                    GEMIOLI.SoundLoader.loadAtlas("sound/sounds.js", null, null, (data) => {
                        if (data && data.sounds) {
                            // console.log('AudioPreloader.init: sound atlas 加载成功 (通过回调).');
                            this.soundAtlasReady = true; // 在回调中设置
                            resolve();
                        } else {
                            console.error('AudioPreloader.init: sound atlas 加载失败 (通过回调).');
                            // 即使失败，也 resolve，避免阻塞，但 soundAtlasReady 仍为 false
                            resolve();
                        }
                    });
                });
            } catch (error) {
                console.error('AudioPreloader.init: 主动加载 sound atlas 时发生错误:', error);
            }
        } else {
            console.warn('AudioPreloader.init: GEMIOLI.SoundLoader.loadAtlas 不可用，无法主动加载 sound atlas.');
        }


        // 添加页面可见性变化事件监听
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // 添加用户交互事件监听，用于解锁音频上下文
        // 移动设备使用 touchstart，PC 使用 mousedown
        // 使用 { once: true } 选项，确保事件只触发一次并自动移除监听器
        if (this.isMobile) {
            document.addEventListener('touchstart', this.unlockAudioHandler.bind(this), { once: true });
            // console.log('Added touchstart listener for audio unlock.');
        }
        // 为所有设备添加 touchstart 监听器，以确保在触摸屏PC上也能解锁
        document.addEventListener('touchstart', this.unlockAudioHandler.bind(this), { once: true });
        // 为所有设备（包括 PC）添加 mousedown 监听器
        document.addEventListener('mousedown', this.unlockAudioHandler.bind(this), { once: true });
        // console.log('Added mousedown listener for audio unlock.');

        // 添加全局错误处理，捕获音频加载错误
        this.setupErrorHandling();
    },

    // 根据设备类型选择音频文件
    selectAudioFiles: function() {
        // 音频文件基本路径
        const basePaths = [
            '',                  // 根目录
            'sound/',           // sound目录
            'sound/desktop/',   // 桌面音频目录
            'sound/mobile/'     // 移动设备音频目录
        ];

        // 音频文件名
        const fileNames = [
            'sounds.ogg' // 只保留 .ogg，因为项目中只有 ogg 文件
        ];

        // 根据设备类型选择优先路径
        let priorityPaths = this.isMobile ?
            ['sound/mobile/', 'sound/desktop/', 'sound/', ''] :
            ['sound/desktop/', 'sound/mobile/', 'sound/', ''];

        // 生成所有可能的文件路径
        this.audioFiles = [];

        // 添加优先路径
        priorityPaths.forEach(path => {
            fileNames.forEach(fileName => {
                this.audioFiles.push(path + fileName);
            });
        });

        // console.log('选择的音频文件列表:', this.audioFiles);
    },

    // 设置全局错误处理
    setupErrorHandling: function() {
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            // 检查是否是音频加载错误
            if (event.message && (
                event.message.includes("Can't load sounds.ogg") ||
                event.message.includes("Can't load sounds.mp3") ||
                event.message.includes("please refresh the page")
            )) {
                // console.log('捕获到音频加载错误，尝试恢复...');

                // 阻止默认错误处理
                event.preventDefault();

                // 尝试恢复
                this.recoverFromAudioError();

                return true;
            }
        }, true);
    },

    // 从音频错误中恢复
    recoverFromAudioError: function() {
        // console.log('尝试从音频错误中恢复...');

        // 检查GEMIOLI是否已加载
        if (typeof GEMIOLI !== 'undefined') {
            // 替换SoundLoader
            this.replaceSoundLoader();

            // 尝试重新加载音频
            this.preloadAudioFiles();

            // 如果游戏已经加载，尝试恢复游戏
            if (GEMIOLI.Application) {
                // console.log('尝试恢复游戏...');

                // 触发焦点事件，尝试恢复游戏
                GEMIOLI.Application.dispatchEvent({type: 'focus'});
            }
        }
    },

    // 设置移动设备音频处理 (现在可能不需要这个函数了，或者只保留移动特有的逻辑)
    // setupMobileAudio: function() {
        // 创建音频上下文 - 已移至 init
        // this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 预加载音频文件 - 已移至 init 的 if/else 分支
        // this.preloadAudioFiles();

        // 替换GEMIOLI.SoundLoader - 已移至 init 的 if/else 分支
        // this.replaceSoundLoader();
    // },

    // 预加载音频文件
    preloadAudioFiles: function() {
        // console.log('预加载音频文件...');

        // 显示加载状态提示
        this.showLoadingStatus();

        // 记录总文件数和已加载文件数
        this.totalFiles = this.audioFiles.length;
        this.loadedFiles = 0;

        // 对每个音频文件进行预加载
        this.audioFiles.forEach(file => {
            this.loadAudioFile(file);
        });

        // 设置超时，如果音频文件加载时间过长，也隐藏加载状态提示
        setTimeout(() => {
            this.hideLoadingStatus();
        }, 5000);
    },

    // 显示加载状态提示
    showLoadingStatus: function() {
        // 检查是否已存在加载提示
        if (document.getElementById('audio-loading-status')) {
            return;
        }

        // 创建加载状态提示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'audio-loading-status';
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.7); color: white; padding: 15px; border-radius: 10px; z-index: 10000; text-align: center; font-family: Arial, sans-serif;';

        // 添加标题
        const title = document.createElement('div');
        title.textContent = '正在加载游戏音频...';
        title.style.cssText = 'font-size: 16px; margin-bottom: 10px; font-weight: bold;';
        loadingDiv.appendChild(title);

        // 添加进度条容器
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'width: 200px; height: 10px; background-color: #444; border-radius: 5px; overflow: hidden;';
        loadingDiv.appendChild(progressContainer);

        // 添加进度条
        const progressBar = document.createElement('div');
        progressBar.id = 'audio-loading-progress';
        progressBar.style.cssText = 'width: 0%; height: 100%; background-color: #3b99fc; transition: width 0.3s;';
        progressContainer.appendChild(progressBar);

        // 添加提示文本
        const tip = document.createElement('div');
        tip.textContent = '首次加载可能需要一些时间...';
        tip.style.cssText = 'font-size: 12px; margin-top: 10px; color: #aaa;';
        loadingDiv.appendChild(tip);

        // 添加到页面
        document.body.appendChild(loadingDiv);
    },

    // 隐藏加载状态提示
    hideLoadingStatus: function() {
        const loadingDiv = document.getElementById('audio-loading-status');
        if (loadingDiv) {
            // 添加淡出动画
            loadingDiv.style.transition = 'opacity 0.5s';
            loadingDiv.style.opacity = '0';

            // 移除元素
            setTimeout(() => {
                if (document.body.contains(loadingDiv)) {
                    document.body.removeChild(loadingDiv);
                }
            }, 500);
        }
    },

    // 更新加载进度
    updateLoadingProgress: function() {
        this.loadedFiles++;
        const progress = Math.min(100, Math.round((this.loadedFiles / this.totalFiles) * 100));

        // 更新进度条
        const progressBar = document.getElementById('audio-loading-progress');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }

        // 如果所有文件都已加载，隐藏加载状态提示
        if (this.loadedFiles >= this.totalFiles) {
            setTimeout(() => {
                this.hideLoadingStatus();
            }, 500);
        }
    },

    // 加载单个音频文件
    loadAudioFile: async function(file) { // Make it async
        // console.log('尝试加载音频文件为 AudioBuffer:', file);
        if (!this.audioContext) {
            console.warn('AudioContext not available, cannot load audio file:', file);
            this.updateLoadingProgress(); // Still update progress to avoid getting stuck
            return;
        }

        try {
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${file}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                // console.log('音频文件解码成功并存储为 AudioBuffer:', file);
                this.loadedAudio[file] = buffer; // Store AudioBuffer
                this.updateLoadingProgress();
            }, (error) => {
                console.error('解码音频数据失败:', file, error);
                this.updateLoadingProgress();
                // Try next file if this was the primary one and alternatives exist
                if (this.audioFiles.indexOf(file) === 0 && this.audioFiles.length > 1) {
                    // console.log('尝试加载备用音频文件（解码失败后）');
                }
            });
        } catch (error) {
            console.error('获取音频文件失败:', file, error);
            this.updateLoadingProgress();
            // Try next file if this was the primary one and alternatives exist
            if (this.audioFiles.indexOf(file) === 0 && this.audioFiles.length > 1) {
                // console.log('尝试加载备用音频文件（获取失败后）');
            }
        }
    },

    // 替换GEMIOLI.SoundLoader
    replaceSoundLoader: function() {
        // 保存原始的SoundLoader
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.SoundLoader) {
            this.originalSoundLoader = GEMIOLI.SoundLoader; // 保存一份原始引用，以备不时之需

            // 替换SoundLoader
            GEMIOLI.SoundLoader = {
                _isMuted: false, // 内部状态跟踪
                _volume: 1,      // 内部状态跟踪
                _soundInstanceCache: {}, // 新增：用于缓存 SoundInstance 对象

                load: function(name) { // 改为普通函数以访问 this._soundInstanceCache
                    // console.log('使用替代的SoundLoader加载音频:', name);

                    if (this._soundInstanceCache[name]) {
                        // console.log(`Returning cached SoundInstance for "${name}"`);
                        return this._soundInstanceCache[name];
                    }

                    // 返回一个带有play方法的对象，模拟原始SoundLoader返回的SoundInstance
                    const soundInstance = {
                        _name: name,
                        volume: 1, // 直接属性，默认为1
                        _loop: false, // 内部循环状态
                        _activeSource: null, // 用于存储当前通过 AudioContext 播放的 sourceNode

                        play: function(loopCount, loopBoolean) { // 接受游戏传入的参数
                            const originalLoopCount = loopCount;
                            const originalLoopBoolean = loopBoolean;
                            let initialLoopState = this._loop;

                            // 首先根据传入参数确定或更新 this._loop 状态
                            if (typeof loopBoolean === 'boolean') {
                                this._loop = loopBoolean;
                            } else if (typeof loopCount === 'boolean') { // 兼容 play(true) 的情况
                                this._loop = loopCount;
                            } else if (typeof loopCount === 'number') { // 兼容 play(0) 表示无限循环
                                this._loop = (loopCount === 0);
                            }
                            // 如果没有提供循环参数，this._loop 将保持其先前的值（初始为 false，除非在构造时或之前被修改）

                            let activeSourceState = "null";
                            if (this._activeSource) {
                                activeSourceState = `Exists (type: ${typeof this._activeSource}, has stop: ${typeof this._activeSource.stop === 'function'})`;
                            }

                            // 增加针对特定音效的详细日志
                            // if (this._name === "menu" || this._name === "gameplay_loop" || this._name === "shieldActive") {
                            //     console.log(`[SoundInstance.play DEBUG] For "${this._name}":
                            //         Initial this._loop: ${initialLoopState},
                            //         Received loopCount: ${originalLoopCount} (type: ${typeof originalLoopCount}),
                            //         Received loopBoolean: ${originalLoopBoolean} (type: ${typeof originalLoopBoolean}),
                            //         Determined this._loop: ${this._loop},
                            //         IsMuted: ${GEMIOLI.SoundLoader._isMuted},
                            //         _activeSource state: ${activeSourceState}`);
                            // } else {
                            //     console.log(`[SoundInstance.play] For "${this._name}". IsMuted: ${GEMIOLI.SoundLoader._isMuted}. Loop: ${this._loop}. Current _activeSource state: ${activeSourceState}`);
                            // }

                            if (this._activeSource && typeof this._activeSource.stop === 'function') {
                                if (this._loop) {
                                    // 对于循环音效，如果已经在播放，则忽略新的播放请求。
                                    // console.log(`[SoundInstance.play] Looping sound "${this._name}" (${this._loop}) is already active. Play call IGNORED.`);
                                    return this;
                                } else {
                                    // 对于非循环音效，停止上一个实例，以便新的可以立即播放。
                                    // console.log(`[SoundInstance.play] Non-looping sound "${this._name}" (${this._loop}) re-triggered. Stopping previous instance.`);
                                    this.stop(); // stop() 方法会负责将 this._activeSource 置为 null
                                }
                            }

                            // console.log(`[SoundInstance.play] For "${this._name}", proceeding to call AudioPreloader.playSound. Final this._loop: ${this._loop}`);
                            if (!GEMIOLI.SoundLoader._isMuted) {
                                AudioPreloader.playSound(this._name, this); // 传递 soundInstance 以便 playSound 可以设置 _activeSource
                            } else {
                                // console.log(`[SoundInstance.play] SoundLoader is muted, play attempt for "${this._name}" suppressed.`);
                            }
                            return this;
                        },
                        stop: function() {
                            // console.log(`[SoundInstance.stop] Called for "${this._name}". Current _activeSource: ${this._activeSource ? 'Exists' : 'null'}`);
                            if (this._activeSource && typeof this._activeSource.stop === 'function') {
                                try {
                                    // console.log(`[SoundInstance.stop] Attempting to call stop() on _activeSource for "${this._name}".`);
                                    this._activeSource.stop(); // 实际停止 Web Audio API 的音源
                                    // console.log(`[SoundInstance.stop] Successfully called stop() on _activeSource for "${this._name}".`);
                                } catch (e) {
                                    console.warn(`[SoundInstance.stop] Error calling stop() on _activeSource for "${this._name}": ${e.message}`);
                                }
                                this._activeSource = null; // 清除对此音源的引用
                                // console.log(`[SoundInstance.stop] _activeSource for "${this._name}" has been set to null.`);
                            } else {
                                if (this._activeSource) {
                                    console.warn(`[SoundInstance.stop] For "${this._name}", _activeSource exists but is not a valid source node (no stop method). Setting to null.`);
                                    this._activeSource = null;
                                } else {
                                    // console.log(`[SoundInstance.stop] No active source to stop for "${this._name}".`);
                                }
                            }
                        }
                        // game.js 直接访问 .volume 属性，所以定义为直接属性是合适的。
                        // 如果 game.js 使用 setVolume/getVolume 方法，则需要实现这些方法来操作 this.volume。
                    };
                    this._soundInstanceCache[name] = soundInstance; // 缓存新创建的实例
                    // console.log(`Created and cached new SoundInstance for "${name}"`);
                    return soundInstance;
                },
                // 添加 GEMIOLI.SoundLoader 级别的方法
                mute: function() {
                    // console.log('GEMIOLI.SoundLoader.mute() called');
                    this._isMuted = true;
                    // 如果需要，可以在这里实际操作 AudioContext 的全局音量或静音状态
                    if (AudioPreloader.audioContext && AudioPreloader.audioContext.destination) {
                        // 简单示例：可以创建一个主增益节点来控制全局音量/静音
                        // 但这需要更复杂的 AudioContext 管理
                    }
                },
                unmute: function() {
                    // console.log('GEMIOLI.SoundLoader.unmute() called');
                    this._isMuted = false;
                },
                setVolume: function(volume) {
                    // console.log(`GEMIOLI.SoundLoader.setVolume(${volume}) called`);
                    this._volume = Math.max(0, Math.min(1, volume));
                    // 同样，这里可以操作 AudioContext 的全局音量
                },
                getVolume: function() {
                    // console.log('GEMIOLI.SoundLoader.getVolume() called, returning:', this._volume);
                    return this._volume;
                },
                isMuted: function() {
                    // console.log('GEMIOLI.SoundLoader.isMuted() called, returning:', this._isMuted);
                    return this._isMuted;
                },
                // 如果原始 SoundLoader 有 stopAll 等方法，也应添加
                stopAll: function() {
                    // console.log('GEMIOLI.SoundLoader.stopAll() called (no-op)');
                },
                loadAtlas: function(atlasPath, audioPath, unknownNull, callback) { // 改为同步返回，但内部异步；返回Promise以便外部等待
                    // console.log(`Shimmed GEMIOLI.SoundLoader.loadAtlas called with: ${atlasPath}, ${audioPath}`);
                    // 使用 AudioPreloader 的 soundAtlasReady 标志
                    const self = AudioPreloader; // 需要访问 AudioPreloader.soundAtlasReady

                    return new Promise(async (resolve, reject) => {
                        if (atlasPath === "sound/sounds.js") {
                            try {
                                const response = await fetch(atlasPath);
                                if (!response.ok) {
                                    console.error(`Failed to fetch sound atlas: ${atlasPath}, status: ${response.status}`);
                                    if (callback) callback(null);
                                    self.soundAtlasReady = false; // 明确设置失败状态
                                    reject(new Error(`Failed to fetch sound atlas: ${response.status}`));
                                    return;
                                }
                                const rawSoundData = await response.json();

                                const processedSounds = {};
                                rawSoundData.forEach(item => {
                                    processedSounds[item.id] = {
                                        offset: item.s,
                                        duration: item.e - item.s
                                    };
                                });

                                if (typeof GEMIOLI !== 'undefined') {
                                    GEMIOLI.Sounds = processedSounds;
                                    // console.log('GEMIOLI.Sounds populated by shimmed loadAtlas:', GEMIOLI.Sounds);
                                    self.soundAtlasReady = true; // 设置成功状态
                                } else {
                                    console.error('GEMIOLI is undefined, cannot set GEMIOLI.Sounds in shimmed loadAtlas');
                                    self.soundAtlasReady = false;
                                }

                                if (callback && typeof callback === 'function') {
                                    callback({ sounds: processedSounds });
                                }
                                resolve({ sounds: processedSounds }); // Promise resolve
                            } catch (error) {
                                console.error(`Error in shimmed loadAtlas processing ${atlasPath}:`, error);
                                if (callback && typeof callback === 'function') callback(null);
                                self.soundAtlasReady = false;
                                reject(error); // Promise reject
                            }
                        } else {
                            console.warn(`Shimmed loadAtlas called with unexpected atlasPath: ${atlasPath}`);
                            if (callback && typeof callback === 'function') callback(null);
                            self.soundAtlasReady = false; // 对于未知路径，也标记为未准备好
                            resolve(null); // 或者 reject，取决于期望行为
                        }
                    });
                }
                // ... 其他 GEMIOLI.SoundLoader 可能有的方法
            };

            // console.log('已替换GEMIOLI.SoundLoader (with stubs for mute/unmute/loadAtlas etc.)');
        } else {
            // console.log('GEMIOLI.SoundLoader不存在，将在GEMIOLI加载后替换');
            const checkInterval = setInterval(() => {
                if (typeof GEMIOLI !== 'undefined' && GEMIOLI.SoundLoader) {
                    clearInterval(checkInterval);
                    // this 指向 AudioPreloader，所以可以直接调用
                    this.replaceSoundLoader();
                }
            }, 100);
        }
    },

    // 播放音效
    playSound: function(name, soundInstanceRef) { // 接收 soundInstanceRef

        // 详细记录传入的参数
        const soundInstanceName = soundInstanceRef && soundInstanceRef._name ? soundInstanceRef._name : "UnknownInstance";
        // const soundInstanceLoopState = soundInstanceRef && typeof soundInstanceRef._loop === 'boolean' ? soundInstanceRef._loop : "N/A";
        // const soundInstanceVolume = soundInstanceRef && typeof soundInstanceRef.volume !== 'undefined' ? soundInstanceRef.volume : "N/A";

        // console.log(`[AudioPreloader.playSound ENTRY] Requested name: "${name}"
    // - soundInstanceRef._name: "${soundInstanceName}"
    // - soundInstanceRef._loop: ${soundInstanceLoopState}
    // - soundInstanceRef.volume: ${soundInstanceVolume}
    // - soundInstanceRef._activeSource: ${soundInstanceRef && soundInstanceRef._activeSource ? 'Exists' : 'null'}`);

        // 检查 AudioContext 是否已成功激活
        if (!this.audioContext || this.audioContext.state !== 'running') {
            console.warn(`AudioContext not running or not available. Cannot play sound: ${name}. State: ${this.audioContext ? this.audioContext.state : 'undefined'}`);
            if (this.audioContext && this.audioContext.state === 'suspended') {
                // console.log(`AudioContext is suspended while trying to play "${name}", attempting to unlock.`);
                this.unlockAudio();
            }
            if (!this.audioContext || this.audioContext.state !== 'running') {
                console.warn(`[AudioPreloader.playSound EXIT] AudioContext still not running for "${name}". Playback aborted.`);
                return;
            }
        }

        // 检查 soundAtlas 是否已准备好
        if (!this.soundAtlasReady) {
            console.warn(`[AudioPreloader.playSound WARNING] Sound atlas (GEMIOLI.Sounds) not ready yet. Requested name: "${name}". Playback might be incorrect or use fallback.`);
            // 可以选择在这里直接返回，或者允许 fallback 逻辑继续
            // 如果 GEMIOLI.Sounds 对所有音效都至关重要，则应在此处返回或延迟
        }

        // 尝试播放音效
        try {
            if (this.audioContext) { // 移除isMobile条件，对所有设备使用相同处理
                let audioBufferToPlay = null;
                let soundPath = '';

                for (const path of this.audioFiles) {
                    if (this.loadedAudio[path] instanceof AudioBuffer) {
                        audioBufferToPlay = this.loadedAudio[path];
                        soundPath = path;
                        break;
                    }
                }

                // 修改条件：即使 GEMIOLI.Sounds[name] 可能不存在（因为 soundAtlasReady 可能为 false），
                // 也要尝试进入，以便 fallback 逻辑可以处理
                if (audioBufferToPlay && typeof GEMIOLI !== 'undefined') {
                    const soundData = (this.soundAtlasReady && GEMIOLI.Sounds) ? GEMIOLI.Sounds[name] : null;
                    const offset = soundData ? soundData.offset : 0; // Fallback to 0 if no soundData
                    const duration = soundData ? soundData.duration : (audioBufferToPlay ? audioBufferToPlay.duration : 0); // Fallback to full duration

                    const loop = soundInstanceRef && typeof soundInstanceRef._loop === 'boolean' ? soundInstanceRef._loop : false;

                    // console.log(`[AudioPreloader.playSound INTERNAL] Effective name: "${name}", InstanceName: "${soundInstanceName}", Effective loop: ${loop}, Offset: ${offset}, Duration: ${duration}, Path: ${soundPath}, SoundDataFound: ${!!soundData}`);

                    const source = this.audioContext.createBufferSource();
                    source.buffer = audioBufferToPlay;
                    source.connect(this.audioContext.destination);
                    source.loop = loop;

                    if (soundInstanceRef) {
                        if (soundInstanceRef._activeSource && typeof soundInstanceRef._activeSource.stop === 'function' && !loop) {
                            try {
                                // console.log(`[AudioPreloader.playSound] Stopping existing non-looping activeSource for "${soundInstanceName}" before playing new one.`);
                                soundInstanceRef._activeSource.stop();
                            } catch (e) { console.warn("Error stopping previous source:", e); }
                        }
                        soundInstanceRef._activeSource = source;
                        // console.log(`[AudioPreloader.playSound] Assigned new AudioBufferSourceNode to _activeSource for "${soundInstanceName}" (loop: ${loop}).`);
                    } else {
                        console.warn(`[AudioPreloader.playSound] soundInstanceRef is null for "${name}", cannot assign _activeSource.`);
                    }

                    source.onended = () => {
                        const currentInstanceName = soundInstanceRef && soundInstanceRef._name ? soundInstanceRef._name : "UnknownInstanceOnEnd";
                        // console.log(`[onended-fallback] Event triggered for requested name "${name}" (Instance: "${currentInstanceName}", loop: ${loop}). Path: ${soundPath}`);
                        if (soundInstanceRef) {
                            if (soundInstanceRef._activeSource === source && !loop) {
                                // console.log(`[onended-fallback] For "${currentInstanceName}" (non-looping), _activeSource was this source. Setting to null.`);
                                soundInstanceRef._activeSource = null;
                            } else if (soundInstanceRef._activeSource !== source) {
                                // console.log(`[onended-fallback] For "${currentInstanceName}", _activeSource was different/null. Current _activeSource: ${soundInstanceRef._activeSource ? 'Exists' : 'null'}`);
                            } else if (loop) {
                                // console.log(`[onended-fallback] For looping sound "${currentInstanceName}", onended triggered but _activeSource not cleared as it should loop or be explicitly stopped.`);
                            }
                        } else {
                            // console.log(`[onended-fallback] soundInstanceRef is null for requested name "${name}" onended.`);
                        }
                    };

                    if (soundData) { // 如果有精确的 soundData，则播放片段或完整循环
                        if (loop) {
                            source.start(0); // 循环音效从头播放整个片段（如果 duration 定义了片段）或整个 buffer
                            // console.log(`Played full buffer/segment (looping, soundData found) for: ${name} from ${soundPath} using AudioContext`);
                        } else {
                            source.start(0, offset, duration);
                            // console.log(`Played segment (offset: ${offset}, duration: ${duration}, soundData found) for: ${name} from ${soundPath} using AudioContext`);
                        }
                    } else { // Fallback: GEMIOLI.Sounds[name] 未找到，或 soundAtlas 未准备好
                        console.warn(`[AudioPreloader.playSound FALLBACK] Sound data for "${name}" not found or atlas not ready. Playing full buffer. Loop: ${loop}`);
                        source.start(0); // 播放整个 buffer
                        // console.log(`Played full buffer (fallback, soundData NOT found) for: ${name} from ${soundPath} using AudioContext`);
                    }
                } else {
                    if (!audioBufferToPlay) {
                        console.warn(`AudioBuffer not loaded for any of the files, cannot play: ${name}`);
                    } else {
                         console.warn(`GEMIOLI object not available. Cannot play "${name}".`);
                    }
                    // console.warn(`[AudioPreloader.playSound EXIT] Conditions not met for playing "${name}".`);
                }
            } else {
                console.warn(`AudioContext not available. Cannot play sound: ${name}.`);
                // console.warn(`[AudioPreloader.playSound EXIT] Conditions not met for playing "${name}".`);
            }
        } catch (error) {
            console.error(`Error playing sound ${name}:`, error);
            // console.warn(`[AudioPreloader.playSound EXIT] Error during playback for "${name}".`);
        }
    },

    // 处理页面可见性变化
    handleVisibilityChange: function() {
        // console.log('处理页面可见性变化:', document.visibilityState);
        if (document.visibilityState === 'visible') {
            // console.log('页面变为可见，恢复音频上下文');

            // 恢复音频上下文
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } else {
            // console.log('页面变为不可见，暂停音频上下文');

            // 暂停音频上下文
            if (this.audioContext && this.audioContext.state === 'running') {
                this.audioContext.suspend();
            }
        }
    },

    // 处理解锁音频的事件（包装器）
    // 这个函数会在第一次用户交互（touchstart 或 mousedown）时被调用
    unlockAudioHandler: function(event) {
        // console.log(`Unlock audio handler triggered by: ${event.type}`);
        // 调用实际的解锁逻辑
        this.unlockAudio().then(success => {
            if (success) {
                // console.log('Audio unlock successful (or already unlocked). Listener should be auto-removed by {once: true}.');
            } else {
                // console.log('Audio unlock failed. Listener should be auto-removed by {once: true}.');
                // 可以在这里添加一些用户提示，告知音频可能无法播放
            }
        });
        // 注意：由于使用了 {once: true}，我们不需要手动移除监听器。
    },

    // 解锁/恢复音频上下文的实际逻辑
    unlockAudio: async function() { // 改为 async 函数以使用 await
        // console.log('Attempting to unlock/resume AudioContext...');
        if (!this.audioContext) {
            console.warn('Cannot unlock audio: AudioContext is not available.');
            return false;
        }

        const attemptResumeExistingContext = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                // console.log('Existing AudioContext is suspended, trying to resume...');
                try {
                    await this.audioContext.resume();
                    // console.log('AudioContext resumed successfully via resume(). State:', this.audioContext.state);
                    if (this.audioContext.state === 'running') {
                        // Play a very short silent sound to be absolutely sure
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();
                        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                        oscillator.connect(gainNode);
                        gainNode.connect(this.audioContext.destination);
                        oscillator.start();
                        oscillator.stop(this.audioContext.currentTime + 0.01);
                        return true; // Successfully resumed and running
                    } else {
                        console.warn('AudioContext.resume() called, but state is not "running":', this.audioContext.state);
                        return false; // Resumed but not running
                    }
                } catch (error) {
                    console.error('Error resuming existing AudioContext:', error);
                    return false; // Resume failed
                }
            } else if (this.audioContext && this.audioContext.state === 'running') {
                // console.log('Existing AudioContext is already running.');
                return true; // Already running
            }
            // console.log('No existing AudioContext to resume or state is not "suspended".');
            return false; // No action needed/possible on existing context
        };

        const tryRecreateContext = async () => {
            // console.log('Attempting to create a new AudioContext as a fallback...');
            try {
                // Close existing context if it exists and is not in a good state
                if (this.audioContext && typeof this.audioContext.close === 'function' && this.audioContext.state !== 'closed') {
                    // console.log('Closing previous AudioContext before recreating. State:', this.audioContext.state);
                    await this.audioContext.close().catch(e => console.warn('Error closing previous AudioContext:', e));
                }

                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                // console.log('New AudioContext created. Initial state:', this.audioContext.state);

                // After creating, it might still be suspended and need a resume.
                if (this.audioContext.state === 'suspended') {
                    // console.log('Newly created AudioContext is suspended, attempting to resume it...');
                    await this.audioContext.resume();
                    // console.log('Newly created AudioContext resumed. State:', this.audioContext.state);
                }

                if (this.audioContext.state === 'running') {
                    // console.log('New AudioContext is now running.');
                    // Play a very short silent sound
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.01);
                    return true; // Successfully created and running
                } else {
                    console.warn('Failed to get the new AudioContext into a running state. Final state:', this.audioContext.state);
                    return false;
                }
            } catch (error) {
                console.error('Error creating or resuming new AudioContext:', error);
                this.audioContext = null; // Ensure it's null if creation failed badly
                return false;
            }
        };

        // 重复的声明已被移除

        // 使用 async/await 执行尝试链
        let success = await attemptResumeExistingContext();
        if (!success) {
            // console.log('Resuming existing context failed or not applicable, trying to recreate context.');
            success = await tryRecreateContext();
        }

        // console.log('Final unlock audio result:', success);
        return success; // 返回最终结果
        // The following .then and .catch are remnants of a previous Promise-based implementation
        // and are causing syntax errors with the current async/await structure.
        // They are no longer needed as error handling is done within the async functions
        // and the final result is returned directly.
        /*
        }).then(finalSuccess => {
            if (finalSuccess) {
                // console.log('AudioContext should now be active and running.');
            } else {
                console.error('All attempts to activate AudioContext failed.');
            }
        }).catch(finalError => {
            // This catch is for errors in the promise chaining logic itself, though individual steps have their own catches.
            console.error('Critical error in AudioContext activation chain:', finalError);
        });
        */
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    AudioPreloader.init();
});
