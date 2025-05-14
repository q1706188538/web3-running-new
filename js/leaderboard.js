/**
 * 排行榜面板管理器
 */
const LeaderboardPanel = {
    panelElement: null,
    listElement: null,
    isLoading: false,

    init: function() {
        if (this.panelElement) {
            return; // 已经初始化
        }
        console.log('初始化排行榜面板...');
        this.createDOM();
        // 初始时绑定关闭按钮事件，如果面板已创建
        const closeButton = this.panelElement.querySelector('.leaderboard-close-btn');
        if (closeButton) {
            closeButton.addEventListener('click', this.hide.bind(this));
        }
    },

    createDOM: function() {
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'leaderboard-panel';
        this.panelElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            display: none; /* Initially hidden */
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 2500; /* Ensure it's above other UI elements like login screen */
            font-family: Arial, sans-serif;
            color: white;
            padding: 20px;
            box-sizing: border-box;
        `;

        const contentBox = document.createElement('div');
        contentBox.style.cssText = `
            background-color: #2c3e50;
            padding: 30px;
            border-radius: 10px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            text-align: center;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
        `;

        const title = document.createElement('h2');
        title.textContent = '游戏排行榜';
        title.style.cssText = 'margin-top: 0; margin-bottom: 25px; color: #ecf0f1; font-size: 28px;';

        this.listElement = document.createElement('ul');
        this.listElement.id = 'leaderboard-list';
        this.listElement.style.cssText = `
            list-style: none;
            padding: 0;
            margin: 0 0 25px 0;
            text-align: left;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.className = 'leaderboard-close-btn wallet-button'; // Re-use wallet button style if desired
        closeButton.style.cssText = `
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: background-color 0.3s;
        `;
        closeButton.onmouseover = function() { this.style.backgroundColor = '#c0392b'; };
        closeButton.onmouseout = function() { this.style.backgroundColor = '#e74c3c'; };
        // Event listener for close button will be added in init or show

        contentBox.appendChild(title);
        contentBox.appendChild(this.listElement);
        contentBox.appendChild(closeButton);
        this.panelElement.appendChild(contentBox);

        document.body.appendChild(this.panelElement);
    },

    show: function() {
        if (!this.panelElement) {
            this.init(); //确保已初始化
        }
        console.log('显示排行榜面板...');
        this.panelElement.style.display = 'flex';
        this.loadAndDisplayData();
    },

    hide: function() {
        if (this.panelElement) {
            console.log('隐藏排行榜面板...');
            this.panelElement.style.display = 'none';
        }
    },

    loadAndDisplayData: async function() {
        if (this.isLoading) {
            return;
        }
        this.isLoading = true;
        this.listElement.innerHTML = '<li>加载中...</li>'; // Loading indicator

        try {
            // TODO: 确保您的服务器在'/api/leaderboard-data'提供数据
            const response = await fetch('/api/leaderboard-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const leaderboardData = await response.json(); // 假设API返回已排序的数组 [{userId: "...", score: ...}, ...]

            this.listElement.innerHTML = ''; // Clear previous entries or loading indicator

            if (leaderboardData && leaderboardData.length > 0) {
                leaderboardData.forEach((entry, index) => {
                    const listItem = document.createElement('li');
                    const displayName = entry.userId.startsWith('0x') ? `${entry.userId.substring(0, 6)}...${entry.userId.substring(entry.userId.length - 4)}` : entry.userId;

                    // 使用Flexbox改进对齐
                    listItem.style.cssText = `
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 5px; /* 增加一点垂直padding，左右padding给内部span */
                        border-bottom: 1px solid #34495e;
                        align-items: center; /* 垂直居中对齐 */
                    `;

                    const rankSpan = document.createElement('span');
                    rankSpan.textContent = `#${index + 1}`;
                    rankSpan.style.cssText = 'font-weight: bold; color: #bdc3c7; min-width: 40px; text-align: left;'; // 给排名一个最小宽度

                    const userSpan = document.createElement('span');
                    userSpan.textContent = displayName;
                    userSpan.style.cssText = 'color: #ecf0f1; flex-grow: 1; text-align: center; margin: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'; // 用户名居中并处理溢出

                    const scoreSpan = document.createElement('span');
                    scoreSpan.textContent = entry.score;
                    scoreSpan.style.cssText = 'color: #f1c40f; min-width: 60px; text-align: right; font-weight: bold;'; // 分数右对齐并给最小宽度

                    listItem.appendChild(rankSpan);
                    listItem.appendChild(userSpan);
                    listItem.appendChild(scoreSpan);
                    
                    if (index === leaderboardData.length - 1) {
                        listItem.style.borderBottom = 'none';
                    }
                    this.listElement.appendChild(listItem);
                });
            } else {
                this.listElement.innerHTML = '<li>暂无排行数据。</li>';
            }

        } catch (error) {
            console.error('加载排行榜数据失败:', error);
            this.listElement.innerHTML = '<li>加载排行榜数据失败，请稍后重试。</li>';
        } finally {
            this.isLoading = false;
        }
    }
};

// 自动初始化排行榜面板的DOM结构，但不显示它
// 确保在DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LeaderboardPanel.init());
} else {
    LeaderboardPanel.init();
}