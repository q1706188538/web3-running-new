document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const errorMessage = document.getElementById('errorMessage');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const refreshButton = document.getElementById('refreshButton');

    // Recharge Tab Elements
    const rechargeLoading = document.getElementById('rechargeLoading');
    const rechargeNoRecords = document.getElementById('rechargeNoRecords');
    const rechargeTable = document.getElementById('rechargeTable');
    const rechargeTableBody = document.getElementById('rechargeTableBody');
    const rechargePagination = document.getElementById('rechargePagination');

    // Withdrawal Tab Elements
    const withdrawalLoading = document.getElementById('withdrawalLoading');
    const withdrawalNoRecords = document.getElementById('withdrawalNoRecords');
    const withdrawalTable = document.getElementById('withdrawalTable');
    const withdrawalTableBody = document.getElementById('withdrawalTableBody');
    const withdrawalPagination = document.getElementById('withdrawalPagination');

    // State
    let allRechargeRecords = [];
    let allWithdrawalRecords = [];
    let filteredRechargeRecords = [];
    let filteredWithdrawalRecords = [];
    let rechargePage = 1;
    let withdrawalPage = 1;
    const recordsPerPage = 20;

    // Tab Switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Refresh Button Click Event
    refreshButton.addEventListener('click', () => {
        rechargePage = 1;
        withdrawalPage = 1;
        fetchAllTransactionRecords();
    });

    // Status Filter Change Event
    statusFilter.addEventListener('change', () => {
        applyFilters();
    });

    // Date Filter Change Event
    dateFilter.addEventListener('change', () => {
        applyFilters();
    });

    // Apply Filters
    function applyFilters() {
        const status = statusFilter.value;
        const date = dateFilter.value;

        // Apply filters to recharge records
        filteredRechargeRecords = filterRecords(allRechargeRecords, status, date);
        rechargePage = 1;
        if (filteredRechargeRecords.length === 0) {
            showRechargeNoRecords();
        } else {
            displayRechargeRecords();
        }

        // Apply filters to withdrawal records
        filteredWithdrawalRecords = filterRecords(allWithdrawalRecords, status, date);
        withdrawalPage = 1;
        if (filteredWithdrawalRecords.length === 0) {
            showWithdrawalNoRecords();
        } else {
            displayWithdrawalRecords();
        }
    }

    // Filter Records
    function filterRecords(records, status, date) {
        return records.filter(record => {
            // Status filter
            if (status !== 'all') {
                if (status === 'failed' && !record.status.includes('failed')) {
                    return false;
                } else if (status !== 'failed' && record.status !== status) {
                    return false;
                }
            }

            // Date filter
            if (date !== 'all') {
                const recordDate = new Date(record.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (date === 'today') {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return recordDate >= today && recordDate < tomorrow;
                } else if (date === 'yesterday') {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return recordDate >= yesterday && recordDate < today;
                } else if (date === 'last7days') {
                    const last7days = new Date(today);
                    last7days.setDate(last7days.getDate() - 7);
                    return recordDate >= last7days;
                } else if (date === 'last30days') {
                    const last30days = new Date(today);
                    last30days.setDate(last30days.getDate() - 30);
                    return recordDate >= last30days;
                }
            }

            return true;
        });
    }

    // Fetch All Transaction Records
    async function fetchAllTransactionRecords() {
        hideError();

        // Fetch All Recharge Records
        fetchAllRechargeRecords();

        // Fetch All Withdrawal Records
        fetchAllWithdrawalRecords();
    }

    // Fetch All Recharge Records
    async function fetchAllRechargeRecords() {
        showRechargeLoading();

        try {
            const response = await fetch('/api/admin/all-recharge-history');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `获取充值记录失败: ${response.status}`);
            }

            const data = await response.json();
            allRechargeRecords = data.history || [];
            filteredRechargeRecords = allRechargeRecords;

            if (filteredRechargeRecords.length === 0) {
                showRechargeNoRecords();
            } else {
                displayRechargeRecords();
            }
        } catch (error) {
            console.error('获取充值记录出错:', error);
            showError(`获取充值记录出错: ${error.message}`);
            showRechargeNoRecords();
        }
    }

    // Fetch All Withdrawal Records
    async function fetchAllWithdrawalRecords() {
        showWithdrawalLoading();

        try {
            const response = await fetch('/api/admin/all-withdrawal-history');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `获取提现记录失败: ${response.status}`);
            }

            const data = await response.json();
            allWithdrawalRecords = data.history || [];
            filteredWithdrawalRecords = allWithdrawalRecords;

            if (filteredWithdrawalRecords.length === 0) {
                showWithdrawalNoRecords();
            } else {
                displayWithdrawalRecords();
            }
        } catch (error) {
            console.error('获取提现记录出错:', error);
            showError(`获取提现记录出错: ${error.message}`);
            showWithdrawalNoRecords();
        }
    }

    // Display Recharge Records
    function displayRechargeRecords() {
        const startIndex = (rechargePage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const recordsToDisplay = filteredRechargeRecords.slice(startIndex, endIndex);

        rechargeTableBody.innerHTML = '';

        recordsToDisplay.forEach(record => {
            const row = document.createElement('tr');

            // Format date
            const date = new Date(record.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

            // Status class
            const statusClass = getStatusClass(record.status);

            // Format wallet address
            const walletAddress = record.playerAddress || '-';
            const shortAddress = walletAddress.length > 10 ?
                `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` :
                walletAddress;

            // Create row
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td class="address-cell" title="${walletAddress}">${shortAddress}</td>
                <td>${record.tokenAmount}</td>
                <td>${record.gameCoinsToGain}</td>
                <td class="${statusClass}">${getStatusText(record.status)}</td>
                <td class="tx-hash-cell">${record.txHash || '-'}</td>
                <td>
                    <button class="copy-button" data-address="${walletAddress}">复制地址</button>
                    ${record.txHash ? `<button class="copy-button" data-txhash="${record.txHash}">复制交易哈希</button>` : ''}
                    <button class="details-button" data-type="recharge" data-index="${startIndex + recordsToDisplay.indexOf(record)}">详情</button>
                </td>
            `;

            rechargeTableBody.appendChild(row);
        });

        // Create pagination
        createPagination(rechargePagination, filteredRechargeRecords.length, rechargePage, page => {
            rechargePage = page;
            displayRechargeRecords();
        });

        hideRechargeLoading();
        rechargeTable.style.display = 'table';
    }

    // Display Withdrawal Records
    function displayWithdrawalRecords() {
        const startIndex = (withdrawalPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const recordsToDisplay = filteredWithdrawalRecords.slice(startIndex, endIndex);

        withdrawalTableBody.innerHTML = '';

        recordsToDisplay.forEach(record => {
            const row = document.createElement('tr');

            // Format date
            const date = new Date(record.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

            // Status class
            const statusClass = getStatusClass(record.status);

            // Format wallet address
            const walletAddress = record.playerAddress || '-';
            const shortAddress = walletAddress.length > 10 ?
                `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` :
                walletAddress;

            // Create row
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td class="address-cell" title="${walletAddress}">${shortAddress}</td>
                <td>${record.tokenAmount}</td>
                <td>${record.gameCoins}</td>
                <td class="${statusClass}">${getStatusText(record.status)}</td>
                <td class="tx-hash-cell">${record.txHash || '-'}</td>
                <td>
                    <button class="copy-button" data-address="${walletAddress}">复制地址</button>
                    ${record.txHash ? `<button class="copy-button" data-txhash="${record.txHash}">复制交易哈希</button>` : ''}
                    <button class="details-button" data-type="withdrawal" data-index="${startIndex + recordsToDisplay.indexOf(record)}">详情</button>
                </td>
            `;

            withdrawalTableBody.appendChild(row);
        });

        // Create pagination
        createPagination(withdrawalPagination, filteredWithdrawalRecords.length, withdrawalPage, page => {
            withdrawalPage = page;
            displayWithdrawalRecords();
        });

        hideWithdrawalLoading();
        withdrawalTable.style.display = 'table';
    }

    // Create Pagination
    function createPagination(container, totalRecords, currentPage, onPageChange) {
        container.innerHTML = '';

        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        if (totalPages <= 1) {
            return;
        }

        // Previous button
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '上一页';
            prevButton.addEventListener('click', () => onPageChange(currentPage - 1));
            container.appendChild(prevButton);
        }

        // Page buttons
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            const firstPageButton = document.createElement('button');
            firstPageButton.textContent = '1';
            firstPageButton.addEventListener('click', () => onPageChange(1));
            container.appendChild(firstPageButton);

            if (startPage > 2) {
                const ellipsisSpan = document.createElement('span');
                ellipsisSpan.textContent = '...';
                ellipsisSpan.style.margin = '0 5px';
                container.appendChild(ellipsisSpan);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => onPageChange(i));
            container.appendChild(pageButton);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisSpan = document.createElement('span');
                ellipsisSpan.textContent = '...';
                ellipsisSpan.style.margin = '0 5px';
                container.appendChild(ellipsisSpan);
            }

            const lastPageButton = document.createElement('button');
            lastPageButton.textContent = totalPages;
            lastPageButton.addEventListener('click', () => onPageChange(totalPages));
            container.appendChild(lastPageButton);
        }

        // Next button
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '下一页';
            nextButton.addEventListener('click', () => onPageChange(currentPage + 1));
            container.appendChild(nextButton);
        }
    }

    // Event delegation for copy and details buttons
    document.addEventListener('click', function(event) {
        // Copy address button
        if (event.target.classList.contains('copy-button') && event.target.dataset.address) {
            copyToClipboard(event.target.dataset.address);
            event.target.textContent = '已复制';
            setTimeout(() => {
                event.target.textContent = '复制地址';
            }, 2000);
        }

        // Copy txHash button
        if (event.target.classList.contains('copy-button') && event.target.dataset.txhash) {
            copyToClipboard(event.target.dataset.txhash);
            event.target.textContent = '已复制';
            setTimeout(() => {
                event.target.textContent = '复制交易哈希';
            }, 2000);
        }

        // Details button
        if (event.target.classList.contains('details-button')) {
            const type = event.target.dataset.type;
            const index = parseInt(event.target.dataset.index);

            if (type === 'recharge') {
                showRecordDetails(filteredRechargeRecords[index], event.target.parentNode.parentNode);
            } else if (type === 'withdrawal') {
                showRecordDetails(filteredWithdrawalRecords[index], event.target.parentNode.parentNode);
            }
        }
    });

    // Show Record Details
    function showRecordDetails(record, row) {
        // Remove any existing details
        const existingDetails = document.querySelectorAll('.transaction-details');
        existingDetails.forEach(detail => detail.remove());

        // Create details element
        const detailsRow = document.createElement('tr');
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 6;
        detailsCell.className = 'transaction-details';

        // Format details content
        let detailsContent = '<strong>交易详情:</strong><br>';
        for (const [key, value] of Object.entries(record)) {
            if (key !== 'playerAddress' && key !== 'txHash') {
                detailsContent += `<strong>${getFieldLabel(key)}:</strong> ${value}<br>`;
            }
        }

        detailsCell.innerHTML = detailsContent;
        detailsRow.appendChild(detailsCell);

        // Insert after the clicked row
        row.parentNode.insertBefore(detailsRow, row.nextSibling);
    }

    // Helper Functions
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showRechargeLoading() {
        rechargeLoading.style.display = 'block';
        rechargeTable.style.display = 'none';
        rechargeNoRecords.style.display = 'none';
    }

    function hideRechargeLoading() {
        rechargeLoading.style.display = 'none';
    }

    function showRechargeNoRecords() {
        hideRechargeLoading();
        rechargeNoRecords.style.display = 'block';
        rechargeTable.style.display = 'none';
    }

    function showWithdrawalLoading() {
        withdrawalLoading.style.display = 'block';
        withdrawalTable.style.display = 'none';
        withdrawalNoRecords.style.display = 'none';
    }

    function hideWithdrawalLoading() {
        withdrawalLoading.style.display = 'none';
    }

    function showWithdrawalNoRecords() {
        hideWithdrawalLoading();
        withdrawalNoRecords.style.display = 'block';
        withdrawalTable.style.display = 'none';
    }

    function getStatusClass(status) {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'pending': return 'status-pending';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-failed';
        }
    }

    function getStatusText(status) {
        switch (status) {
            case 'completed': return '已完成';
            case 'pending': return '处理中';
            case 'cancelled': return '已取消';
            default: return status.startsWith('failed') ? '失败' : status;
        }
    }

    function getFieldLabel(key) {
        const labels = {
            date: '创建时间',
            completedAt: '完成时间',
            cancelledAt: '取消时间',
            tokenAmount: '代币数量',
            gameCoins: '游戏金币',
            gameCoinsToGain: '游戏金币',
            nonce: '唯一标识',
            status: '状态',
            coinsDeducted: '金币已扣除',
            coinsBalanceAfter: '扣除后余额',
            cancelReason: '取消原因',
            failureReason: '失败原因',
            isInverse: '反向模式',
            contractAddress: '合约地址'
        };
        return labels[key] || key;
    }

    async function copyToClipboard(text) {
        try {
            // 使用现代的 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }

            // 回退到旧方法
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
        }
    }

    // 初始加载
    fetchAllTransactionRecords();
});
