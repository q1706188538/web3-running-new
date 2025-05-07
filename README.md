# H5神庙逃亡游戏

这是一个基于HTML5的3D神庙逃亡游戏，适合移动设备，可以打包成APP。

## 游戏特点

- 3D图形和效果
- 自适应设计，适合各种屏幕尺寸
- 触摸控制支持
- 完整的游戏资源（模型、音效等）

## 如何运行游戏

### 方法1：使用Python HTTP服务器

1. 确保已安装Python
2. 在游戏目录下运行以下命令：

```
python -m http.server 8000
```

3. 在浏览器中访问 http://localhost:8000

### 方法2：使用其他HTTP服务器

您可以使用任何HTTP服务器来托管游戏文件，例如：

- Node.js的http-server
- Apache
- Nginx

## 打包成APP

### 使用Cordova打包

1. 安装Cordova：

```
npm install -g cordova
```

2. 创建Cordova项目：

```
cordova create TempleRun com.example.templerun "神庙逃亡"
```

3. 进入项目目录：

```
cd TempleRun
```

4. 添加平台：

```
cordova platform add android
cordova platform add ios  # 需要Mac和Xcode
```

5. 将游戏文件复制到www目录

6. 构建APP：

```
cordova build android
cordova build ios  # 需要Mac和Xcode
```

### 使用Capacitor打包

1. 安装Capacitor：

```
npm install @capacitor/cli @capacitor/core
npx cap init
```

2. 添加平台：

```
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios  # 需要Mac和Xcode
```

3. 将游戏文件放入项目中

4. 构建并同步：

```
npx cap sync
```

5. 打开原生IDE进行最终构建：

```
npx cap open android
npx cap open ios  # 需要Mac和Xcode
```

## 游戏操作

- 左右滑动：移动角色
- 上滑：跳跃
- 下滑：滑行

## 许可证

本游戏仅供学习和个人使用。
