/**
 * 快速搜索组件
 * 实现浮动、可拖动的快速搜索功能
 */

// 搜索状态
let isSearchVisible = false;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// 辅助函数：判断任务是否应在四象限显示
function isTaskInQuadrant(taskData) {
    if (!taskData) return false;
    // 确保任务是活动的 (status === 'active' 或者 !completed) 并且具有相关优先级
    const isActive = taskData.status ? taskData.status === 'active' : !taskData.completed;
    return isActive && ['high', 'medium', 'low'].includes(taskData.priority);
}

// 创建搜索框元素
function createSearchElement() {
    // 如果已存在搜索框，返回
    if (document.getElementById('quick-search-container')) {
        return document.getElementById('quick-search-container');
    }
    
    // 创建搜索框容器
    const searchContainer = document.createElement('div');
    searchContainer.id = 'quick-search-container';
    searchContainer.className = 'quick-search-container';
    
    // 创建搜索框内容
    searchContainer.innerHTML = `
        <div class="quick-search-header">
            <!-- <div class="quick-search-drag-handle">
                <i class="fas fa-grip-lines"></i>
            </div> -->
            <div class="quick-search-title">快速搜索</div>
            <div class="quick-search-close">
                <i class="fas fa-times"></i>
            </div>
        </div>
        <div class="quick-search-input-container">
            <i class="fas fa-search"></i>
            <input type="text" class="quick-search-input" placeholder="搜索任务或标签..." autofocus>
            <div class="quick-search-scope">
                <span class="scope-option active" data-scope="all">全部</span>
                <span class="scope-option" data-scope="tasks">任务</span>
                <span class="scope-option" data-scope="tags">标签</span>
            </div>
        </div>
        <div class="quick-search-results"></div>
        <div class="quick-search-footer">
            <div class="search-tip">
                <span class="key-combo">↑↓</span> 导航
                <span class="key-combo">Enter</span> 选择
                <span class="key-combo">Esc</span> 关闭
            </div>
        </div>
    `;
    
    // 添加到文档
    document.body.appendChild(searchContainer);
    
    // 设置搜索框位置居中
    centerSearchBox(searchContainer);
    
    return searchContainer;
}

// 显示搜索框
function showQuickSearch() {
    if (isSearchVisible) return;
    
    const searchContainer = createSearchElement();
    searchContainer.style.display = 'flex';
    
    // 添加CSS过渡动画类
    setTimeout(() => {
        searchContainer.classList.add('visible');
    }, 10);
    
    // 聚焦到搜索框
    const searchInput = searchContainer.querySelector('.quick-search-input');
    if (searchInput) {
        searchInput.focus();
    }
    
    isSearchVisible = true;
    
    // 初始搜索结果为空
    updateSearchResults([]);
    
    // 设置拖拽功能
    setupDragAndDrop();
    
    // 设置搜索和关闭按钮事件
    setupSearchEvents();
}

// 隐藏搜索框
function hideQuickSearch() {
    if (!isSearchVisible) return;
    
    const searchContainer = document.getElementById('quick-search-container');
    if (searchContainer) {
        // 移除CSS过渡动画类
        searchContainer.classList.remove('visible');
        
        // 等待过渡效果完成后隐藏
        setTimeout(() => {
            searchContainer.style.display = 'none';
            
            // 清空搜索框
            const searchInput = searchContainer.querySelector('.quick-search-input');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // 清空搜索结果
            updateSearchResults([]);
        }, 200);
    }
    
    isSearchVisible = false;
}

// 切换搜索框显示状态
function toggleQuickSearch() {
    if (isSearchVisible) {
        hideQuickSearch();
    } else {
        showQuickSearch();
    }
}

// 居中搜索框
function centerSearchBox(searchContainer) {
    const width = 400; // 搜索框宽度
    const height = 400; // 搜索框高度
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const left = (windowWidth - width) / 2;
    const top = (windowHeight - height) / 3; // 上三分之一位置
    
    searchContainer.style.left = `${left}px`;
    searchContainer.style.top = `${top}px`;
}

// 搜索任务和标签
function performSearch(searchTerm, scope = 'all') {
    if (!searchTerm) {
        return [];
    }
    
    const term = searchTerm.toLowerCase().trim();
    const results = [];
    
    // 获取任务列表
    const allTasks = window.TaskManager ? window.TaskManager.getTasks() : [];
    
    // 搜索任务
    if (scope === 'all' || scope === 'tasks') {
        const matchingTasks = allTasks.filter(task => {
            const taskText = task.text.toLowerCase();
            return taskText.includes(term);
        }).map(task => ({
            type: 'task',
            id: task.id,
            text: task.text,
            completed: task.completed,
            priority: task.priority,
            dueDate: task.dueDate,
            tags: task.tags
        }));
        
        results.push(...matchingTasks);
    }
    
    // 搜索标签
    if (scope === 'all' || scope === 'tags') {
        // 收集所有唯一标签
        const allTags = new Set();
        allTasks.forEach(task => {
            if (task.tags && Array.isArray(task.tags)) {
                task.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        // 过滤匹配的标签
        const matchingTags = Array.from(allTags)
            .filter(tag => tag.toLowerCase().includes(term))
            .map(tag => ({
                type: 'tag',
                tag: tag,
                count: allTasks.filter(t => t.tags && t.tags.includes(tag)).length
            }));
            
        results.push(...matchingTags);
    }
    
    return results;
}

// 更新搜索结果
function updateSearchResults(results) {
    const resultsContainer = document.querySelector('.quick-search-results');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">无结果</div>';
        return;
    }
    
    let html = '';
    
    // 任务结果
    const tasks = results.filter(result => result.type === 'task');
    if (tasks.length > 0) {
        html += '<div class="result-section"><div class="result-section-title">任务</div>';
        
        tasks.forEach(task => {
            const priorityClass = task.priority ? `priority-${task.priority}` : '';
            const completedClass = task.completed ? 'completed' : '';
            
            html += `
                <div class="result-item task-result ${completedClass}" data-type="task" data-id="${task.id}">
                    <div class="result-icon ${priorityClass}">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <div class="result-content">
                        <div class="result-title ${completedClass}">${task.text}</div>
                        <div class="result-details">
                            ${task.dueDate ? `<span class="result-due-date"><i class="far fa-calendar-alt"></i> ${formatDateDisplay(task.dueDate)}</span>` : ''}
                            ${task.tags && task.tags.length > 0 ? 
                                `<span class="result-tags">${task.tags.map(tag => `<span class="result-tag">${tag}</span>`).join('')}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // 标签结果
    const tags = results.filter(result => result.type === 'tag');
    if (tags.length > 0) {
        html += '<div class="result-section"><div class="result-section-title">标签</div>';
        
        tags.forEach(tag => {
            html += `
                <div class="result-item tag-result" data-type="tag" data-tag="${tag.tag}">
                    <div class="result-icon">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="result-content">
                        <div class="result-title">${tag.tag}</div>
                        <div class="result-details">
                            <span class="tag-count">${tag.count} 个任务</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    resultsContainer.innerHTML = html;
    
    // 默认选中第一个结果
    const firstResult = resultsContainer.querySelector('.result-item');
    if (firstResult) {
        firstResult.classList.add('active');
    }
}

// 格式化日期显示
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${month}月${day}日`;
}

// 处理选择结果
function handleResultSelection(resultItem) {
    if (!resultItem) return;
    
    const type = resultItem.dataset.type;
    
    if (type === 'task') {
        const taskId = parseInt(resultItem.dataset.id);
        const allTasks = window.TaskManager ? window.TaskManager.getTasks() : [];
        const taskData = allTasks.find(t => t.id === taskId);

        if (!taskData) {
            console.warn(`QuickSearch: Task data for ID ${taskId} not found.`);
            hideQuickSearch();
            return;
        }

        if (isTaskInQuadrant(taskData)) {
            // 是四象限任务
            console.log(`QuickSearch: Task ${taskId} is a quadrant task. Switching and focusing.`);
            const quadrantTab = document.querySelector('.tab-item[data-tab="quadrant"]');
            if (quadrantTab && !quadrantTab.classList.contains('active')) {
                quadrantTab.click(); // 切换到四象限视图
            }
            
            // 使用双重 requestAnimationFrame 确保视图切换和DOM更新完成
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (window.QuadrantManager && typeof window.QuadrantManager.focusTaskOnPage === 'function') {
                        window.QuadrantManager.focusTaskOnPage(taskId);
                    } else {
                        console.error('QuadrantManager.focusTaskOnPage is not available.');
                    }
                });
            });
            hideQuickSearch(); // 移到此处，确保在启动异步聚焦后立即隐藏

        } else {
            // 非四象限任务，执行原有逻辑
            console.log(`QuickSearch: Task ${taskId} is a standard list task. Focusing.`);
            const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
            if (taskElement) {
                const section = taskElement.closest('.task-section');
                if (section) {
                    const collapseBtn = section.querySelector('.collapse-btn');
                    if (collapseBtn && collapseBtn.classList.contains('collapsed')) {
                        collapseBtn.click();
                    }
                }
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                taskElement.style.transition = 'background-color 0.3s ease';
                taskElement.style.backgroundColor = 'var(--task-focus-highlight-bg)'; // 使用统一的CSS变量
                setTimeout(() => {
                    taskElement.style.backgroundColor = '';
                }, 2000);
            } else {
                console.warn(`QuickSearch: Standard task element for ID ${taskId} not found.`);
            }
            hideQuickSearch();
        }

    } else if (type === 'tag') {
        const tagName = resultItem.dataset.tag;
        console.log(`过滤标签: ${tagName}`);
        // filterTasksByTag(tagName); // 实际的标签过滤逻辑可以取消注释或实现
        hideQuickSearch();
    }
}

// 导航搜索结果
function navigateSearchResults(direction) {
    const results = document.querySelectorAll('.result-item');
    if (results.length === 0) return;
    
    const currentActive = document.querySelector('.result-item.active');
    let nextActive;
    
    if (!currentActive) {
        nextActive = results[0];
    } else {
        const currentIndex = Array.from(results).indexOf(currentActive);
        
        if (direction === 'down') {
            nextActive = results[currentIndex + 1] || results[0]; // 循环到第一个
        } else if (direction === 'up') {
            nextActive = results[currentIndex - 1] || results[results.length - 1]; // 循环到最后一个
        }
    }
    
    if (nextActive) {
        // 移除所有活动状态
        results.forEach(result => result.classList.remove('active'));
        
        // 设置新的活动项
        nextActive.classList.add('active');
        
        // 确保可见
        nextActive.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 设置拖拽功能
function setupDragAndDrop() {
    const searchContainer = document.getElementById('quick-search-container');
    if (!searchContainer) return;

    let initialContainerX = 0;
    let initialContainerY = 0;


    searchContainer.addEventListener('mousedown', (e) => {
        const target = e.target;

        
        const isInteractiveElement = 
            target.tagName === 'INPUT' || 
            target.tagName === 'BUTTON' || 
            target.closest('.quick-search-close') || 
            target.closest('.scope-option') || 
            target.closest('.result-item') ||
            target.closest('.quick-search-input-container');
            
        if (isInteractiveElement) {

            return; 
        }


        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        
        initialContainerX = parseFloat(searchContainer.style.left) || 0;
        initialContainerY = parseFloat(searchContainer.style.top) || 0;
        if (initialContainerX === 0 && initialContainerY === 0) {
             const containerRect = searchContainer.getBoundingClientRect();
             initialContainerX = containerRect.left;
             initialContainerY = containerRect.top;
            // console.warn('[Drag Debug] Reading style failed, falling back to getBoundingClientRect');
        }
       
        // console.log(`[Drag Debug] Initial Container Style: Left=${initialContainerX}px, Top=${initialContainerY}px`);
        
        searchContainer.classList.add('dragging');
        e.preventDefault(); 
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        const newLeft = initialContainerX + deltaX;
        const newTop = initialContainerY + deltaY;
        // console.log(`[Drag Debug] Mouse Move: CurrX=${currentX}, CurrY=${currentY}, DeltaX=${deltaX}, DeltaY=${deltaY}, NewLeft=${newLeft}, NewTop=${newTop}`);
        
        searchContainer.style.left = `${newLeft}px`;
        searchContainer.style.top = `${newTop}px`;
    });
    
    document.addEventListener('mouseup', (e) => { 
        if (isDragging) {
            // console.log('[Drag Debug] Mouse Up, ending drag.');
            isDragging = false;
            searchContainer.classList.remove('dragging');
        }
    });

    // --- Touch Events --- 
    searchContainer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const target = touch.target;
        // console.log('[Drag Debug] Touchstart Target:', target);

        const isInteractiveElement = 
            target.tagName === 'INPUT' || 
            target.tagName === 'BUTTON' || 
            target.closest('.quick-search-close') || 
            target.closest('.scope-option') || 
            target.closest('.result-item') ||
            target.closest('.quick-search-input-container');

        if (isInteractiveElement) {
            // console.log('[Drag Debug] Touchstart on interactive element, drag prevented.');
            return; 
        }
        // console.log('[Drag Debug] Touchstart on draggable area, starting drag...');

        isDragging = true;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        // console.log(`[Drag Debug] Touch Start Coords: StartX=${dragStartX}, StartY=${dragStartY}`);
        
        initialContainerX = parseFloat(searchContainer.style.left) || 0;
        initialContainerY = parseFloat(searchContainer.style.top) || 0;
        if (initialContainerX === 0 && initialContainerY === 0) {
             const containerRect = searchContainer.getBoundingClientRect();
             initialContainerX = containerRect.left;
             initialContainerY = containerRect.top;
            // console.warn('[Drag Debug] Reading style failed, falling back to getBoundingClientRect');
        }

        // console.log(`[Drag Debug] Initial Container Style: Left=${initialContainerX}px, Top=${initialContainerY}px`);
        
        searchContainer.classList.add('dragging');
        e.preventDefault();
    }, { passive: false }); 

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length === 0) return;
        const touch = e.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        const newLeft = initialContainerX + deltaX;
        const newTop = initialContainerY + deltaY;
        // console.log(`[Drag Debug] Touch Move: CurrX=${currentX}, CurrY=${currentY}, DeltaX=${deltaX}, DeltaY=${deltaY}, NewLeft=${newLeft}, NewTop=${newTop}`);
        
        searchContainer.style.left = `${newLeft}px`;
        searchContainer.style.top = `${newTop}px`;
        e.preventDefault(); 
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (isDragging) {
            // console.log('[Drag Debug] Touchend, ending drag.');
            isDragging = false;
            searchContainer.classList.remove('dragging');
        }
    });
}

// 设置搜索框事件
function setupSearchEvents() {
    const searchContainer = document.getElementById('quick-search-container');
    if (!searchContainer) return;
    
    // 设置关闭按钮事件
    const closeButton = searchContainer.querySelector('.quick-search-close');
    if (closeButton) {
        closeButton.addEventListener('click', hideQuickSearch);
    }
    
    // 设置输入框事件
    const searchInput = searchContainer.querySelector('.quick-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value;
            const activeScope = searchContainer.querySelector('.scope-option.active');
            const scope = activeScope ? activeScope.dataset.scope : 'all';
            
            const results = performSearch(searchTerm, scope);
            updateSearchResults(results);
        });
        
        // 处理快捷键
        searchInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    hideQuickSearch();
                    break;
                case 'ArrowUp':
                    navigateSearchResults('up');
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    navigateSearchResults('down');
                    e.preventDefault();
                    break;
                case 'Enter':
                    const activeResult = document.querySelector('.result-item.active');
                    if (activeResult) {
                        handleResultSelection(activeResult);
                    }
                    break;
            }
        });
    }
    
    // 设置搜索范围选择事件
    const scopeOptions = searchContainer.querySelectorAll('.scope-option');
    scopeOptions.forEach(option => {
        option.addEventListener('click', () => {
            // 移除所有活动状态
            scopeOptions.forEach(opt => opt.classList.remove('active'));
            
            // 设置新的活动选项
            option.classList.add('active');
            
            // 重新执行搜索
            const searchTerm = searchInput.value;
            const scope = option.dataset.scope;
            
            const results = performSearch(searchTerm, scope);
            updateSearchResults(results);
        });
    });
    
    // 设置结果项点击事件（使用事件委托）
    const resultsContainer = searchContainer.querySelector('.quick-search-results');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            // 查找被点击的结果项
            let resultItem = e.target.closest('.result-item');
            if (resultItem) {
                handleResultSelection(resultItem);
            }
        });
    }
}

// 初始化快速搜索
function initQuickSearch() {
    // 添加全局快捷键
    document.addEventListener('keydown', (e) => {
        // 检测快捷键 Ctrl+K 或 Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            toggleQuickSearch();
        }
    });
    
    // 添加搜索按钮到界面（可选）
    setupSearchButton();
}

// 设置搜索按钮（可选）
function setupSearchButton() {
    // 找到合适的位置添加搜索按钮
    const header = document.querySelector('.header-right');
    
    if (header) {
        const searchButton = document.createElement('button');
        searchButton.className = 'search-button';
        searchButton.innerHTML = '<i class="fas fa-search"></i>';
        searchButton.title = '快速搜索 (Ctrl+K)';
        
        searchButton.addEventListener('click', toggleQuickSearch);
        
        // 添加到页面
        header.prepend(searchButton);
    }
}

// 监听DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    initQuickSearch();
});

// 导出API
window.QuickSearch = {
    show: showQuickSearch,
    hide: hideQuickSearch,
    toggle: toggleQuickSearch
}; 