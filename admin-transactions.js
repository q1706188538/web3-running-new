document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const walletAddressInput = document.getElementById('walletAddressInput');
    const searchButton = document.getElementById('searchButton');
    const errorMessage = document.getElementById('errorMessage');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
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
    let currentWalletAddress = '';
    let rechargeRecords = [];
    let withdrawalRecords = [];
    let rechargePage = 1;
    let withdrawalPage = 1;
    const recordsPerPage = 10;
    
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
    
    // Search Button Click Event
    searchButton.addEventListener('click', () => {
        const walletAddress = walletAddressInput.value.trim();
        if (!walletAddress) {
            showError('请输入钱包地址');
            return;
        }
        
        if (!isValidWalletAddress(walletAddress)) {
            showError('无效的钱包地址格式');
            return;
        }
        
        currentWalletAddress = walletAddress;
        rechargePage = 1;
        withdrawalPage = 1;
        fetchTransactionRecords(walletAddress);
    });
    
    // Fetch Transaction Records
    async function fetchTransactionRecords(walletAddress) {
        hideError();
        
        // Fetch Recharge Records
        fetchRechargeRecords(walletAddress);
        
        // Fetch Withdrawal Records
        fetchWithdrawalRecords(walletAddress);
    }
    
    // Fetch Recharge Records
    async function fetchRechargeRecords(walletAddress) {
        showRechargeLoading();
        
        try {
            const response = await fetch(`/api/user/${walletAddress}/recharge-history`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `获取充值记录失败: ${response.status}`);
            }
            
            const data = await response.json();
            rechargeRecords = data.history || [];
            
            if (rechargeRecords.length === 0) {
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
    
    // Fetch Withdrawal Records
    async function fetchWithdrawalRecords(walletAddress) {
        showWithdrawalLoading();
        
        try {
            const response = await fetch(`/api/user/${walletAddress}/withdrawal-history`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `获取提现记录失败: ${response.status}`);
            }
            
            const data = await response.json();
            withdrawalRecords = data.history || [];
            
            if (withdrawalRecords.length === 0) {
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
        const recordsToDisplay = rechargeRecords.slice(startIndex, endIndex);
        
        rechargeTableBody.innerHTML = '';
        
        recordsToDisplay.forEach(record => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(record.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Status class
            const statusClass = getStatusClass(record.status);
            
            // Create row
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.tokenAmount}</td>
                <td>${record.gameCoinsToGain}</td>
                <td class="${statusClass}">${getStatusText(record.status)}</td>
                <td class="tx-hash-cell">${record.txHash || '-'}</td>
                <td>
                    <button class="copy-button" data-address="${currentWalletAddress}">复制地址</button>
                    ${record.txHash ? `<button class="copy-button" data-txhash="${record.txHash}">复制交易哈希</button>` : ''}
                    <button class="details-button" data-type="recharge" data-index="${startIndex + recordsToDisplay.indexOf(record)}">详情</button>
                </td>
            `;
            
            rechargeTableBody.appendChild(row);
        });
        
        // Create pagination
        createPagination(rechargePagination, rechargeRecords.length, rechargePage, page => {
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
        const recordsToDisplay = withdrawalRecords.slice(startIndex, endIndex);
        
        withdrawalTableBody.innerHTML = '';
        
        recordsToDisplay.forEach(record => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(record.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Status class
            const statusClass = getStatusClass(record.status);
            
            // Create row
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.tokenAmount}</td>
                <td>${record.gameCoins}</td>
                <td class="${statusClass}">${getStatusText(record.status)}</td>
                <td class="tx-hash-cell">${record.txHash || '-'}</td>
                <td>
                    <button class="copy-button" data-address="${currentWalletAddress}">复制地址</button>
                    ${record.txHash ? `<button class="copy-button" data-txhash="${record.txHash}">复制交易哈希</button>` : ''}
                    <button class="details-button" data-type="withdrawal" data-index="${startIndex + recordsToDisplay.indexOf(record)}">详情</button>
                </td>
            `;
            
            withdrawalTableBody.appendChild(row);
        });
        
        // Create pagination
        createPagination(withdrawalPagination, withdrawalRecords.length, withdrawalPage, page => {
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
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => onPageChange(i));
            container.appendChild(pageButton);
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
                showRecordDetails(rechargeRecords[index], event.target.parentNode.parentNode);
            } else if (type === 'withdrawal') {
                showRecordDetails(withdrawalRecords[index], event.target.parentNode.parentNode);
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
    
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    
    function isValidWalletAddress(address) {
        // Simple Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
});
