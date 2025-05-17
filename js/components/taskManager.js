/**
 * 任务管理器组件
 * 管理任务的添加、编辑、删除和状态变更
 */

// 新增：显示 Toast 通知的函数
function showToast(message, type = 'info') {
    // 尝试移除已存在的 toast，确保一次只显示一个（或者根据需求允许多个）
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 应用显示动画的类 (如果CSS中定义了)
    // requestAnimationFrame(() => {
    //     toast.classList.add('show'); 
    // });

    setTimeout(() => {
        // toast.classList.remove('show'); // 移除显示动画的类
        // toast.addEventListener('transitionend', () => toast.remove()); // 等待动画结束后移除
        // 简单移除，如果CSS动画不复杂
        toast.remove();
    }, 3000); // 3秒后自动消失
}

// 新增：显示标签管理页面的消息
function showTagManagerMessage(message, type = 'info') {
    const messageElement = document.getElementById('tag-manager-message');
    if (!messageElement) {
        console.warn('Tag manager message element not found, falling back to console log:', message);
        console.log(`Tag Manager Message [${type}]: ${message}`);
        return;
    }

    // 清除之前的类和文本
    messageElement.className = 'tag-manager-message';
    messageElement.textContent = message;

    // 添加类型类以便CSS着色
    if (type !== 'info') {
        messageElement.classList.add(type);
    }

    // 显示消息
    messageElement.classList.add('show');

    // 消息在一段时间后自动隐藏
    setTimeout(() => {
        messageElement.classList.remove('show');
        // 延迟清空文本，以便动画完成
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.className = 'tag-manager-message'; // 清除所有类型类
        }, 300); // 与CSS过渡时间匹配
    }, 4000); // 4秒后开始隐藏
}

// 任务列表数据
let tasks = [];
let ideas = []; // 新增：用于存储想法及其子任务
let allAvailableTagsList = []; // 新增：存储所有可用标签的独立列表

// 任务优先级状态
let selectedPriority = '';

// 任务标签状态
let selectedTags = [];

// 初始化任务管理器
async function initTaskManager() { // 改为 async
    // 加载任务数据
    await loadTasks(); // 等待数据加载完成
    
    // 只有在数据加载成功后（或者即使失败也要设置基础UI）才继续初始化UI组件
    // 可以在 loadTasks 的 finally 块或者成功的回调中触发这些
    // 但为了保持结构，暂时将它们放在这里，假设 loadTasks 会处理失败情况下的 UI（例如渲染空列表）
    
    // 设置任务输入框事件
    setupTaskInput();
    
    // 设置任务操作事件
    setupTaskActions();
    
    // 设置过滤器和排序
    setupFilters();
    
    // 设置任务区域折叠功能
    setupCollapseButtons();
    
    // 设置任务区域操作按钮（如顺延）
    setupTaskSectionActions();
    
    // 设置输入框前图标点击事件
    setupInputIcons();
    
    // 设置侧边栏菜单项点击事件
    setupSidebarMenuItems();
    
    // 设置已完成页面筛选
    setupCompletedFilters();
    
    // 设置清空已完成任务功能
    setupClearCompleted();
    
    // 初始化任务编辑器模态框的事件监听器
    setupTaskEditorModalListeners();
    
    // 渲染任务列表
    renderTasks();
    
    // 初始化完成统计
    updateCompletionStats();
    updateCompletedMenuCount();
    
    // 添加清空垃圾桶按钮事件监听器
    const emptyTrashButton = document.getElementById('empty-trash-btn');
    if (emptyTrashButton) {
        emptyTrashButton.addEventListener('click', emptyTrash);
    } else {
        console.warn('Empty trash button not found.');
    }

    // 为新的"添加想法"按钮和输入框设置事件监听器 (将在 initTaskManager 末尾添加更完整的版本)
    const addIdeaBtn = document.getElementById('add-idea-btn');
    const newIdeaInput = document.getElementById('new-idea-input');

    if (addIdeaBtn && newIdeaInput) {
        addIdeaBtn.addEventListener('click', () => {
            if (newIdeaInput.value.trim() !== '') {
                addIdea(newIdeaInput.value.trim());
                newIdeaInput.value = '';
            }
        });
        newIdeaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && newIdeaInput.value.trim() !== '') {
                addIdea(newIdeaInput.value.trim());
                newIdeaInput.value = '';
            }
        });
    }
    
    // Clean up any potentially lingering context menu listeners on startup?
    // Or rely on the fact that render functions clear and rebuild the lists.
    
    // Add global listener cleanup maybe?
    document.removeEventListener('click', closeContextMenuOnClickOutside, true);

    // 初始化主输入区的日期选择器
    const mainDateSelectorElement = document.querySelector('.task-date-selector'); // 使用类名选择器
    if (mainDateSelectorElement && typeof DateSelector === 'function') {
        // 初始化日期选择器
        const mainDateSelector = new DateSelector(mainDateSelectorElement, (selectedDate) => {
            // 回调处理日期变更
            selectedDueDate = selectedDate; // 更新全局变量
            updateDateDisplayInUI(); // 更新UI
        });
        
        // 将DateSelector实例存储在DOM元素上，以便其他函数可以访问
        mainDateSelectorElement._dateSelector = mainDateSelector;

        // 新增：为DateSelector的自定义输入框添加"确定"按钮和提示
        const customDateInput = mainDateSelectorElement.querySelector('input[type="date"].custom-date-input'); // 假设自定义输入框有这个类名
        if (customDateInput) {
            customDateInput.placeholder = 'yyyy/mm/dd 或直接选择';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.className = 'confirm-custom-date-btn simple-button'; // 添加一个简单的按钮样式
            confirmBtn.style.marginLeft = '5px';
            confirmBtn.style.display = 'none'; // 默认隐藏

            // 尝试将按钮插入到输入框之后，但在下拉箭头之前 (如果存在)
            // 这部分DOM结构依赖DateSelector.js的实现，可能需要调整
            const dropdownIcon = mainDateSelectorElement.querySelector('.date-selector-dropdown-icon'); 
            if (dropdownIcon) {
                customDateInput.parentNode.insertBefore(confirmBtn, dropdownIcon);
            } else {
                customDateInput.parentNode.appendChild(confirmBtn); 
            }

            customDateInput.addEventListener('input', () => {
                if (customDateInput.value.trim() !== '') {
                    confirmBtn.style.display = 'inline-block';
                } else {
                    confirmBtn.style.display = 'none';
                }
            });

            confirmBtn.addEventListener('click', () => {
                const dateValue = customDateInput.value.trim();
                if (dateValue) {
                    // 简单的日期验证 (yyyy/mm/dd 或 yyyy-mm-dd)
                    const parts = dateValue.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
                    if (parts) {
                        const year = parseInt(parts[1], 10);
                        const month = parseInt(parts[2], 10) -1; // JS月份从0开始
                        const day = parseInt(parts[3], 10);
                        const d = new Date(year, month, day);
                        // 进一步验证日期是否有效 (例如，月份和日期是否在合理范围内，且生成的日期与输入匹配)
                        if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
                            if (window.DateSelector && typeof window.DateSelector.selectDate === 'function') {
                                window.DateSelector.selectDate(d); // 调用DateSelector的公共方法来选择日期
                                window.DateSelector.updateDisplay(); // 更新显示
                                window.DateSelector.hideDropdown(); // 关闭下拉
                                confirmBtn.style.display = 'none'; // 隐藏按钮
                                // customDateInput.value = ''; // 可选：清空输入框
                            } else {
                                console.warn('DateSelector.selectDate method not found.');
                                alert('无法设置日期，DateSelector组件似乎不完整。');
                            }
                        } else {
                            alert('无效的日期，请按 yyyy/mm/dd 格式输入。');
                        }
                    } else {
                        alert('日期格式不正确，请按 yyyy/mm/dd 格式输入。');
                    }
                } else {
                     confirmBtn.style.display = 'none'; // 如果输入为空也隐藏
                }
            });

            // 当通过快捷方式选择日期后，隐藏确认按钮并可能清空自定义输入
            // 这需要DateSelector在选择日期后触发一个事件，或者我们轮询/观察变化
            // 简单起见，如果DateSelector有回调，可以在回调里处理
            // (在DateSelector初始化时传入的回调中)
            const originalCallback = window.DateSelector.callback;
            window.DateSelector.callback = (selectedDate) => {
                if (originalCallback) originalCallback(selectedDate);
                customDateInput.value = ''; // 清空自定义输入
                confirmBtn.style.display = 'none'; // 隐藏确认按钮
            };

        } else {
            console.warn('Custom date input for DateSelector not found with selector: input[type="date"].custom-date-input');
        }

    } else {
        if (!mainDateSelectorElement) console.warn('Main date selector element .task-date-selector not found.');
        if (typeof DateSelector !== 'function') console.warn('DateSelector class not found.');
    }

    // 新增：为添加标签区域设置事件监听器
    const newTagInput = document.getElementById('new-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');

    if (newTagInput && addTagBtn) {
        addTagBtn.addEventListener('click', () => {
            if (newTagInput.value.trim() !== '') {
                addNewTag(newTagInput.value.trim());
                newTagInput.value = ''; // 清空输入框
                newTagInput.focus(); // 保持焦点
            }
        });

        newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && newTagInput.value.trim() !== '') {
                e.preventDefault(); // 防止回车导致页面刷新或表单提交
                addNewTag(newTagInput.value.trim());
                newTagInput.value = ''; // 清空输入框
                newTagInput.focus(); // 保持焦点
            }
        });
    } else {
        console.warn('Add tag input or button not found.');
    }
}

// 修改：加载任务数据（从本地存储）
async function loadTasks() {
    // 添加加载状态 (示例：在任务列表容器上添加 loading 类)
    const todayContainer = document.getElementById('today-container');
    const ideaContainer = document.getElementById('ideas-container'); // 假设想法容器有此ID
    if(todayContainer) todayContainer.classList.add('loading');
    if(ideaContainer) ideaContainer.classList.add('loading');

    try {
        // 从本地存储加载任务和想法
        const storedTasks = localStorage.getItem('tasks');
        const storedIdeas = localStorage.getItem('ideas');
        const storedTagsList = localStorage.getItem('allAvailableTags'); // 新增：加载标签列表

        // 解析存储的数据
        tasks = storedTasks ? JSON.parse(storedTasks) : [];
        ideas = storedIdeas ? JSON.parse(storedIdeas) : [];
        allAvailableTagsList = storedTagsList ? JSON.parse(storedTagsList) : []; // 新增：解析标签列表

        // 数据加载成功后，渲染 UI
        renderTasks(); 
        renderIdeas(); 
        renderCompletedTasks(); // 新增调用
        renderTrashedTasks();   // 新增调用
        updateCompletionStats();
        updateCompletedMenuCount();
        // renderTagsManager(); // 不在 loadTasks 中直接渲染标签管理页面，因为它只在侧边栏点击时显示
        
        // 确保侧边栏计数在加载后更新
        updateTaskCount();


    } catch (error) {
        console.error('Failed to load data from local storage:', error);
        // 在 UI 上显示错误信息，例如在一个专门的错误提示区域
        const errorElement = document.getElementById('loading-error-message'); // 假设有这样一个元素
        if (errorElement) {
            errorElement.textContent = `加载数据失败: ${error.message || '未知错误'}`;
            errorElement.style.display = 'block';
        }
        // 清空本地数据以防显示旧数据
        tasks = [];
        ideas = [];
        allAvailableTagsList = []; // 新增：清空标签列表
        renderTasks(); // 渲染空列表
        renderIdeas(); // 渲染空列表
    } finally {
        // 移除加载状态
        if(todayContainer) todayContainer.classList.remove('loading');
        if(ideaContainer) ideaContainer.classList.remove('loading');
    }
}

// 保存任务到本地存储
function saveTasks() {
    try {
        const tasksString = JSON.stringify(tasks);
        localStorage.setItem('tasks', tasksString);
    } catch (error) {
        console.error('Failed to save tasks to local storage:', error);
    }
}

// 保存想法到本地存储
function saveIdeas() {
    try {
        localStorage.setItem('ideas', JSON.stringify(ideas));
    } catch (error) {
        console.error('Failed to save ideas to local storage:', error);
    }
}

// 新增：保存标签列表到本地存储
function saveTagsList() {
    try {
        localStorage.setItem('allAvailableTags', JSON.stringify(allAvailableTagsList));
    } catch (error) {
        console.error('Failed to save available tags list to local storage:', error);
    }
}

// 设置任务输入框事件
function setupTaskInput() {
    const taskInput = document.querySelector('.task-input-container .task-input');
    if (!taskInput) return;
    
    // 回车键添加任务
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && taskInput.value.trim() !== '') {
            // 创建新任务
            addTask(
                taskInput.value.trim(),
                window.DateSelector ? window.DateSelector.getSelectedValue() : '今天',
                selectedPriority,
                selectedTags
            );
            
            // 重置输入框和选项
            taskInput.value = '';
            resetTaskInputOptions();
        }
    });
    
    // 添加Backspace键删除最后一个标签的功能
    taskInput.addEventListener('keydown', (e) => {
        // 检查是否按下Backspace键
        if (e.key === 'Backspace' && selectedTags.length > 0) {
            // 检查以下两种情况：
            // 1. 输入框为空
            // 2. 输入框有内容但光标位于最前面（位置为0）
            if (taskInput.value === '' || taskInput.selectionStart === 0 && taskInput.selectionEnd === 0) {
                // 获取最后一个标签
                const lastTag = selectedTags[selectedTags.length - 1];
                
                // 移除最后一个标签
                removeSelectedTag(lastTag, selectedTags);
                
                // 更新标签选择器中的选中状态
                const tagSelector = document.querySelector('.task-tag-selector');
                if (tagSelector) {
                    const option = tagSelector.querySelector(`.tag-option[data-tag="${lastTag}"]`);
                    if (option) {
                        option.classList.remove('selected');
                    }
                }
                
                // 更新显示
                updateTagsDisplay();
                
                // 阻止默认行为
                e.preventDefault();
            }
        }
    });
    
    // 监听输入框内容变化，更新标签容器状态
    taskInput.addEventListener('input', updateTagContainerState);
    
    // 监听光标位置变化
    taskInput.addEventListener('click', updateTagContainerState);
    taskInput.addEventListener('keyup', function(e) {
        // 只在方向键按下时更新状态
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            updateTagContainerState();
        }
    });
    
    // 更新标签容器状态的函数
    function updateTagContainerState() {
        const tagsContainer = document.querySelector('.tags-container');
        if (tagsContainer && selectedTags.length > 0) {
            // 当输入框为空或光标在最前面时添加可删除提示类
            if (taskInput.value === '' || (taskInput.selectionStart === 0 && taskInput.selectionEnd === 0)) {
                tagsContainer.classList.add('backspace-ready');
            } else {
                tagsContainer.classList.remove('backspace-ready');
            }
        }
    }
    
    // 设置优先级选择器
    setupPrioritySelector();
    
    // 设置标签选择器
    setupTagSelector();

    // 新：为输入栏的优先级和标签图标按钮设置事件监听器
    const mainPriorityBtn = document.querySelector('.task-input-box .task-priority-selector');
    if (mainPriorityBtn) {
        mainPriorityBtn.onclick = null; // 移除HTML中可能存在的onclick
        mainPriorityBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showNewTaskPriorityMenu(this);
        });
    }

    const mainTagBtn = document.querySelector('.task-input-box .task-tag-selector');
    if (mainTagBtn) {
        mainTagBtn.onclick = null; // 移除HTML中可能存在的onclick
        mainTagBtn.addEventListener('click', function(e) {
           e.stopPropagation();
           showNewTaskTagEditor(this); // 实现此函数
        });
    }
}

// 设置优先级选择器
function setupPrioritySelector() {
    const prioritySelector = document.querySelector('.task-priority-selector');
    if (!prioritySelector) return;
    
    // 优先级选项点击事件
    const priorityOptions = prioritySelector.querySelectorAll('.priority-option');
    priorityOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedPriority = option.dataset.priority;
            
            // 更新优先级图标颜色
            const icon = prioritySelector.querySelector('i');
            icon.style.color = getPriorityColor(selectedPriority);
            
            // 更新优先级文本显示
            const priorityText = prioritySelector.querySelector('.priority-text');
            if (priorityText) {
                if (selectedPriority === 'none' || !selectedPriority) {
                    priorityText.textContent = '';
                    priorityText.classList.remove('has-priority');
                } else {
                    const priorityLabels = {
                        'high': '高优先级',
                        'medium': '中优先级',
                        'low': '低优先级'
                    };
                    priorityText.textContent = priorityLabels[selectedPriority] || '';
                    priorityText.classList.add('has-priority');
                    // 设置优先级标签的背景色
                    priorityText.style.backgroundColor = getPriorityBgColor(selectedPriority);
                    priorityText.style.color = '#fff';
                }
            }
            
            // 关闭下拉菜单
            const dropdown = prioritySelector.querySelector('.priority-dropdown');
            dropdown.style.display = 'none';
            dropdown.classList.remove('dropdown-active');
        });
    });
}

// 设置标签选择器
function setupTagSelector() {
    const tagSelector = document.querySelector('.task-tag-selector');
    if (!tagSelector) return;
    
    // 更新标签选项选中状态
    function updateTagOptions() {
        const options = tagSelector.querySelectorAll('.tag-option');
        options.forEach(option => {
            const tagName = option.dataset.tag;
            if (selectedTags.includes(tagName)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    // 初始更新标签选中状态
    updateTagOptions();
    
    // 当下拉菜单显示时更新选中状态
    const dropdown = tagSelector.querySelector('.tag-dropdown');
    if (dropdown) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && 
                    dropdown.style.display === 'block') {
                    // 下拉菜单显示时更新选中状态
                    updateTagOptions();
                    
                    // 自动聚焦搜索框
                    const searchInput = dropdown.querySelector('.tag-search');
                    if (searchInput) searchInput.focus();
                }
            });
        });
        
        observer.observe(dropdown, { attributes: true });
    }
    
    // 标签搜索
    const tagSearch = tagSelector.querySelector('.tag-search');
    if (tagSearch) {
        // 输入事件过滤标签
        tagSearch.addEventListener('input', () => {
            const searchTerm = tagSearch.value.toLowerCase().trim();
            filterTags(searchTerm, tagSelector);
        });
        
        // 回车创建新标签
        tagSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && tagSearch.value.trim() !== '') {
                const newTag = tagSearch.value.trim();
                
                // 如果标签不存在，添加到列表
                let tagExists = false;
                const options = tagSelector.querySelectorAll('.tag-option');
                options.forEach(option => {
                    if (option.dataset.tag?.toLowerCase() === newTag.toLowerCase()) {
                        tagExists = true;
                        if (!option.classList.contains('selected')) {
                            option.classList.add('selected');
                            addSelectedTag(option.dataset.tag, selectedTags);
                        }
                    }
                });
                
                if (!tagExists) {
                    createTagOption(newTag, tagSelector);
                    addSelectedTag(newTag, selectedTags);
                }
                
                // 清空搜索
                tagSearch.value = '';
                
                // 关闭下拉菜单
                const dropdown = tagSelector.querySelector('.tag-dropdown');
                dropdown.style.display = 'none';
                dropdown.classList.remove('dropdown-active');
                
                // 更新标签显示
                updateTagsDisplay();
            }
        });
    }
    
    // 设置标签选项点击事件
    const tagOptions = tagSelector.querySelectorAll('.tag-option');
    tagOptions.forEach(option => {
        option.addEventListener('click', handleTagOptionClick);
    });
    
    // 标签选项点击处理
    function handleTagOptionClick(e) {
        e.stopPropagation();
        const tagName = this.dataset.tag;
        
        // 切换选中状态
        this.classList.toggle('selected');
        
        if (this.classList.contains('selected')) {
            addSelectedTag(tagName, selectedTags);
        } else {
            removeSelectedTag(tagName, selectedTags);
        }
        
        // 更新已选标签显示
        updateTagsDisplay();
    }
}

// 过滤标签
function filterTags(searchTerm, tagSelector) {
    const tagOptions = tagSelector.querySelectorAll('.tag-option:not(.create-tag-prompt)');
    let hasResults = false;
    
    tagOptions.forEach(option => {
        if (option && option.dataset && option.dataset.tag) {
            const tagName = option.dataset.tag.toLowerCase();
            if (tagName.includes(searchTerm.toLowerCase())) {
                option.style.display = '';
                hasResults = true;
            } else {
                option.style.display = 'none';
            }
        }
    });
    
    // 处理"创建标签"提示
    const tagList = tagSelector.querySelector('.tag-list');
    let createPrompt = tagSelector.querySelector('.create-tag-prompt');
    
    if (searchTerm && !hasResults) {
        if (!createPrompt) {
            createPrompt = document.createElement('div');
            createPrompt.className = 'tag-option create-tag-prompt';
            createPrompt.textContent = `创建标签 "${searchTerm}"`;
            tagList.appendChild(createPrompt);
            
            // 点击创建新标签
            createPrompt.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 创建并选中新标签
                createTagOption(searchTerm, tagSelector);
                addSelectedTag(searchTerm, selectedTags);
                
                // 清空搜索并关闭下拉菜单
                const tagSearch = tagSelector.querySelector('.tag-search');
                if (tagSearch) tagSearch.value = '';
                tagSelector.querySelector('.tag-dropdown').style.display = 'none';
                
                // 更新标签显示
                updateTagsDisplay();
                
                // 移除提示
                createPrompt.remove();
            });
        } else {
            createPrompt.textContent = `创建标签 "${searchTerm}"`;
            createPrompt.style.display = '';
        }
    } else if (createPrompt) {
        createPrompt.style.display = 'none';
    }
}

// 创建标签选项
function createTagOption(tagName, tagSelector) {
    const tagList = tagSelector.querySelector('.tag-list');
    const newOption = document.createElement('div');
    newOption.className = 'tag-option selected'; // 新创建的标签默认选中
    newOption.dataset.tag = tagName;
    newOption.textContent = tagName;
    tagList.appendChild(newOption);
    
    // 添加点击事件
    newOption.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 切换选中状态
        this.classList.toggle('selected');
        
        if (this.classList.contains('selected')) {
            addSelectedTag(tagName, selectedTags);
        } else {
            removeSelectedTag(tagName, selectedTags);
        }
        
        // 更新显示
        updateTagsDisplay();
    });
}

// 添加已选标签
function addSelectedTag(tag, instanceSelectedTags) {
    // Ensure instanceSelectedTags is an array
    if (!Array.isArray(instanceSelectedTags)) {
        console.error('instanceSelectedTags is not an array in addSelectedTag', instanceSelectedTags);
        return; // Or initialize it: instanceSelectedTags = []; (but modifying args like this is tricky)
    }
    if (!instanceSelectedTags.includes(tag)) {
        instanceSelectedTags.push(tag);
    }
}

// 移除已选标签
function removeSelectedTag(tag, instanceSelectedTags) {
    if (!Array.isArray(instanceSelectedTags)) {
        console.error('instanceSelectedTags is not an array in removeSelectedTag', instanceSelectedTags);
        return;
    }
    const index = instanceSelectedTags.indexOf(tag);
    if (index !== -1) {
        instanceSelectedTags.splice(index, 1);
    }
}

// 更新标签显示
function updateTagsDisplay() {
    const taskInput = document.querySelector('.task-input-container .task-input');
    if (!taskInput) return;
    
    // 清除已有标签
    const existingTags = document.querySelectorAll('.tags-container');
    existingTags.forEach(tag => tag.remove());
    
    // 如果没有选中的标签，直接返回
    if (selectedTags.length === 0) return;
    
    // 创建标签容器
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-container';
    
    // 如果输入框为空且有标签，添加可删除提示类
    if (taskInput.value === '') {
        tagsContainer.classList.add('backspace-ready');
    }
    
    // 添加标签
    selectedTags.forEach((tag, index) => {
        const tagElem = document.createElement('span');
        tagElem.className = 'tags-in-input';
        tagElem.innerHTML = `#${tag} <span class="tag-remove">×</span>`;
        tagsContainer.appendChild(tagElem);
        
        // 删除标签点击事件
        const removeBtn = tagElem.querySelector('.tag-remove');
        if (removeBtn) {
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                
                // 移除标签
                removeSelectedTag(tag, selectedTags);
                
                // 更新显示
                updateTagsDisplay();
                
                // 更新标签选择器中的选中状态
                const tagSelector = document.querySelector('.task-tag-selector');
                if (tagSelector) {
                    const options = tagSelector.querySelectorAll('.tag-option');
                    options.forEach(option => {
                        if (option.dataset.tag === tag) {
                            option.classList.remove('selected');
                        }
                    });
                }
            };
        }
    });
    
    // 添加到任务输入框前
    taskInput.parentNode.insertBefore(tagsContainer, taskInput);
}

// 设置任务操作事件
function setupTaskActions() {
    // 设置任务复选框点击事件（使用事件委托）
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            // 移除调试日志: console.log("[DEBUG] Event listener in setupTaskActions is about to call toggleTaskCompleted. Function definition (first 200 chars):", toggleTaskCompleted.toString().substring(0, 300));
            toggleTaskCompleted(e.target);
        }
    });
    
    // 设置任务菜单点击事件（会在添加任务时绑定）
}

// 设置排序功能
function setupFilters() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    
    // 设置排序按钮点击事件
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除其他按钮的激活状态
            sortButtons.forEach(b => b.classList.remove('active'));
            
            // 激活当前按钮
            btn.classList.add('active');
            
            // 重新渲染任务
            renderTasks();
        });
    });
}
    
    // 获取当前选择的排序方式
function getActiveSortType() {
    const activeSort = document.querySelector('.sort-btn.active');
    return activeSort ? activeSort.dataset.sort : 'date';
}

// 排序任务
function sortTasks(taskList, sortType) {
    const sorted = [...taskList];
    
    switch (sortType) {
        case 'priority':
            // 优先级排序：高 > 中 > 低 > 无
            const priorityOrder = { high: 1, medium: 2, low: 3, none: 4, '': 4 };
            return sorted.sort((a, b) => {
                return priorityOrder[a.priority || ''] - priorityOrder[b.priority || ''];
            });
        case 'date':
        default:
            // 日期排序：无日期的任务排在最后
            return sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
    }
}

// 新增：渲染无截止日期任务
function renderNoDeadlineTasks() {
    // 获取所有活动状态且没有截止日期的任务
    const noDeadlineTasks = tasks.filter(task => 
        (task.status === 'active' || task.status === 'PENDING') && !task.dueDate
    );
    
    // 获取无DDL任务列表容器
    const noDeadlineList = document.querySelector('.no-deadline-list');
    if (!noDeadlineList) return;
    
    // 清空当前列表
    noDeadlineList.innerHTML = '';
    
    // 获取排序方式
    const sortType = getActiveSortType();
    
    // 对无DDL任务进行排序
    const sortedTasks = sortTasks(noDeadlineTasks, sortType);
    
    // 添加排序后的任务
    sortedTasks.forEach(task => {
        const taskElement = createTaskElement(task, 'active');
        noDeadlineList.appendChild(taskElement);
        
        // 添加右键菜单监听器
        taskElement.addEventListener('contextmenu', (event) => {
            showTaskContextMenu(event, task.id, 'active');
        });
    });
    
    // 更新计数
    const countSpan = noDeadlineList.closest('.task-section').querySelector('.section-count');
    if (countSpan) {
        countSpan.textContent = noDeadlineTasks.length;
    }
}

// 设置折叠按钮
function setupCollapseButtons() {
    const collapseBtns = document.querySelectorAll('.collapse-btn');
    
    collapseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.closest('.task-section');
            const taskList = section.querySelector('.task-list');
            
            btn.classList.toggle('collapsed');
            
            if (btn.classList.contains('collapsed')) {
                taskList.style.display = 'none';
            } else {
                taskList.style.display = 'block';
            }
        });
    });
}

// 顺延所有已过期任务到今天
function postponeOverdueTasks() {
    // 获取当前日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // 查找所有已过期任务
    const overdueTasks = tasks.filter(task => 
        task.status === 'active' && 
        task.dueDate && 
        new Date(task.dueDate) < today
    );
    
    if (overdueTasks.length === 0) {
        showToast('没有需要顺延的已过期任务', 'info');
        return 0;
    }
    
    // 更新所有已过期任务的日期
    let updatedCount = 0;
    overdueTasks.forEach(task => {
        task.dueDate = todayStr;
        updatedCount++;
    });
    
    // 保存更新
    saveTasks();
    
    // 重新渲染任务列表
    renderTasks();
    
    // 显示提示消息
    showToast(`已将 ${updatedCount} 个过期任务顺延至今天`, 'success');
    
    return updatedCount;
}

// 设置任务区域操作按钮（如顺延）
function setupTaskSectionActions() {
    // 获取已过期区域的顺延按钮
    const postponeButton = document.querySelector('.task-section:nth-child(1) .section-action');
    if (postponeButton) {
        postponeButton.addEventListener('click', () => {
            postponeOverdueTasks();
        });
    }
}

// 修改：添加任务（使用本地存储）
async function addTask(text, date = null, priority = null, tags = [], status = 'active') {
    
    // 构建任务对象
    const newTask = {
        id: Date.now(), // 使用时间戳作为唯一ID
        text: text,
        dueDate: date ? formatDateForStorage(date) : null,
        priority: priority || 'none',
        tags: tags || [],
        status: status,
        createdAt: new Date().toISOString()
    };

    // 添加到任务列表
    tasks.push(newTask);
    
    // 保存到本地存储
    saveTasks();
    
    // 重新渲染任务列表
    renderTasks();
    
    // 更新计数和统计
    updateTaskCount();
    updateCompletionStats();
    
    // 重置输入选项
    resetTaskInputOptions();
    
    return newTask;
}

// 为日期存储格式化日期
function formatDateForStorage(dateStr) {
    // 如果是「X月Y日」格式
    if (typeof dateStr === 'string' && dateStr.includes('月') && dateStr.includes('日')) {
        const match = dateStr.match(/(\d+)月(\d+)日/);
        if (match) {
            const month = parseInt(match[1], 10) - 1;
            const day = parseInt(match[2], 10);
            
            const date = new Date();
            date.setMonth(month);
            date.setDate(day);
            
            // 如果日期已过，设为明年
            if (date < new Date() && month < new Date().getMonth()) {
                date.setFullYear(date.getFullYear() + 1);
            }
            
            return date.toISOString().split('T')[0];
        }
    }
    
    // 尝试直接解析为日期
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    // 无法解析返回今天日期
    return new Date().toISOString().split('T')[0];
}

// 创建任务元素
// viewType 可以是 'active', 'completed', 'trashed'
function createTaskElement(taskData, viewType = 'active') {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('data-id', taskData.id);
    
    // 检查任务是否过期 (只在 active 视图相关)
    const isOverdue = viewType === 'active' && taskData.dueDate && taskData.status !== 'COMPLETED' &&
                     new Date(taskData.dueDate) < new Date().setHours(0, 0, 0, 0);
    
    // 构建标签HTML
    let tagsHtml = '';
    if (taskData.tags && taskData.tags.length > 0) {
        taskData.tags.forEach(tag => {
            tagsHtml += `<span class="task-tag">${tag}</span>`;
        });
    }
    
    // 构建优先级HTML
    let priorityHtml = '';
    if (taskData.priority && taskData.priority !== 'none') {
        const priorityLabels = {
            'high': '高优先级',
            'medium': '中优先级',
            'low': '低优先级'
        };
        const priorityLabel = priorityLabels[taskData.priority] || '';
        const priorityBgColor = getPriorityBgColor(taskData.priority);
        
        priorityHtml = `
            <div class="task-priority ${taskData.priority}">
                <i class="fas fa-flag" style="color: ${getPriorityColor(taskData.priority)};"></i>
                <span class="priority-text has-priority" style="background-color: ${priorityBgColor}; color: #fff;">${priorityLabel}</span>
            </div>
        `;
    }
    
    // 构建日期HTML
    let dateHtml = '';
    if (taskData.dueDate) {
        const formattedDate = formatDateDisplay(taskData.dueDate);
        const dueDateClass = isOverdue ? 'task-due overdue' : 'task-due';
        
        dateHtml = `
            <div class="${dueDateClass}">
                <i class="far fa-calendar-alt"></i> ${formattedDate}
            </div>
        `;
    }

    // 构建任务菜单 HTML (根据 viewType 决定内容)
    let menuOptionsHtml = '';
    if (viewType === 'active' || viewType === 'completed') {
        // 活动和已完成任务的菜单
        menuOptionsHtml = `
            <div class="task-menu-option edit" data-action="edit"><i class="fas fa-edit"></i> 编辑</div>
            <div class="task-menu-option modify-tags" data-action="modify-tags"><i class="fas fa-tags"></i> 修改标签</div>
            <div class="task-menu-option set-priority" data-action="set-priority"><i class="fas fa-flag"></i> 设置优先级</div>
            <div class="task-menu-option trash" data-action="trash"><i class="fas fa-trash-alt"></i> 移至垃圾桶</div>
        `;
    } else if (viewType === 'trashed') {
        // 垃圾桶任务的菜单
        menuOptionsHtml = `
            <div class="task-menu-option restore">
                <i class="fas fa-undo-alt"></i> 恢复
            </div>
            <div class="task-menu-option permanent-delete">
                <i class="fas fa-times-circle"></i> 彻底删除
            </div>
        `;
    } else if (viewType === 'inbox') {
        // 收集箱任务的菜单 (此分支现在应该不再被调用，因为收集箱已重构为想法盒子)
        // 保留空分支或添加警告，以防意外调用
        console.warn("createTaskElement called with deprecated viewType 'inbox'");
        menuOptionsHtml = `
            <div class="task-menu-option process-deprecated">
                <i class="fas fa-cogs"></i> 处理 (旧)
            </div>
            <div class="task-menu-option delete">
                <i class="fas fa-trash-alt"></i> 移至垃圾桶
            </div>
        `;
    }
    
    // 设置任务内容
    const isCompleted = taskData.status === 'COMPLETED';
    li.innerHTML = `
        <div class="task-checkbox ${isCompleted ? 'checked' : ''}" style="${viewType === 'trashed' ? 'cursor: default;' : ''}"></div>
        <div class="task-content">
            <div class="task-title" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${taskData.text}</div>
            <div class="task-details">
                ${priorityHtml}
                ${dateHtml}
                ${tagsHtml}
            </div>
        </div>
        <div class="task-menu">
            <i class="fas fa-ellipsis-v"></i>
            <div class="task-menu-dropdown">
                ${menuOptionsHtml}
            </div>
        </div>
    `;
    
    // 设置任务菜单事件 (需要调整以处理新选项)
    setupTaskMenu(li, viewType);

    // 如果在垃圾桶视图，禁用复选框点击
    if (viewType === 'trashed') {
        const checkbox = li.querySelector('.task-checkbox');
        if (checkbox) {
            // 移除可能的事件监听器或阻止点击
            checkbox.onclick = (e) => e.preventDefault();
        }
    }
    
    return li;
}

// 格式化日期显示
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${month}月${day}日`;
}

// 设置任务菜单事件
function setupTaskMenu(taskElement, viewType) {
    const menuIcon = taskElement.querySelector('.task-menu > i');
    const dropdown = taskElement.querySelector('.task-menu-dropdown');

    if (!menuIcon || !dropdown) return;

    // Close other menus when opening a new one
    const closeOtherMenus = () => {
        document.querySelectorAll('.task-menu-dropdown.open, .detached-menu').forEach(openMenu => {
            if (openMenu !== dropdown) {
                openMenu.classList.remove('open');
                if (openMenu.classList.contains('detached-menu')) {
                    openMenu.remove();
                }
            }
        });
    };

    menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherMenus();

        // Detach menu if it would overflow
        const rect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Get original width BEFORE detaching/cloning
        // Temporarily show original to measure, then hide again
        dropdown.style.visibility = 'hidden';
        dropdown.style.display = 'block';
        const originalWidth = dropdown.offsetWidth;
        dropdown.style.display = 'none';
        dropdown.style.visibility = 'visible';
        
        // Check if bottom overflows OR too close to top
        if (rect.bottom > viewportHeight - 20 || rect.top < 50) { 
            dropdown.style.display = 'none'; // Keep original hidden
            
            // Create and position detached menu
            const detachedDropdown = dropdown.cloneNode(true);
            detachedDropdown.classList.add('detached-menu', 'open');
            detachedDropdown.style.position = 'fixed';
            detachedDropdown.style.visibility = 'hidden'; // Hide while calculating
            detachedDropdown.style.display = 'block'; 
        document.body.appendChild(detachedDropdown);

            // Force reflow is likely not needed now as we use originalWidth
            // void detachedDropdown.offsetHeight; 

            const menuHeight = detachedDropdown.offsetHeight;
            // const menuWidth = detachedDropdown.offsetWidth; // Use originalWidth now
            const iconRect = menuIcon.getBoundingClientRect();
            const spaceBelow = viewportHeight - iconRect.bottom;
            const spaceAbove = iconRect.top;
            const buffer = 10; // Increased buffer slightly

            // Calculate left position 
            let leftPos = iconRect.left;
            const viewportWidth = window.innerWidth;
            // Prevent horizontal overflow
            if (leftPos + originalWidth > viewportWidth - buffer) {
                leftPos = Math.max(buffer, viewportWidth - originalWidth - buffer); // Adjust left, ensure not negative
            }
            detachedDropdown.style.left = `${leftPos}px`;

            // Calculate top position
            let topPos;
            if (spaceBelow >= menuHeight + buffer) {
                // Enough space below
                topPos = iconRect.bottom + buffer / 2; // Position slightly below icon
            } else if (spaceAbove >= menuHeight + buffer) {
                // Enough space above, position above the icon
                topPos = iconRect.top - menuHeight - buffer / 2; // Position slightly above icon
            } else {
                // Not enough space, try to fit by aligning bottom edge with viewport bottom
                topPos = viewportHeight - menuHeight - buffer;
                // Ensure topPos is not negative
                if (topPos < buffer) topPos = buffer; 
            }
            detachedDropdown.style.top = `${topPos}px`;
            
            // **Set the width and minWidth explicitly based on original**
            detachedDropdown.style.width = `${originalWidth}px`;
            detachedDropdown.style.minWidth = `${originalWidth}px`; // Prevent shrinking

            // Make it visible again
            detachedDropdown.style.visibility = 'visible';
            detachedDropdown.style.zIndex = '1100'; // Ensure it's on top (Increased z-index)

            // Add event listeners to the detached menu options
            setupDetachedMenuOptions(detachedDropdown, taskElement, viewType, e.clientX, e.clientY); // Pass viewType and original click coords // {{modified}}

            // Click outside to close detached menu
            const clickOutsideHandler = (event) => {
                if (!detachedDropdown.contains(event.target) && event.target !== menuIcon) {
                    detachedDropdown.remove();
                    document.removeEventListener('click', clickOutsideHandler, true);
                }
            };
            // Use capture phase to catch clicks inside iframe/other components if needed
            setTimeout(() => document.addEventListener('click', clickOutsideHandler, true), 0);

        } else {
            // Normal dropdown behavior
            dropdown.classList.toggle('open');
            dropdown.style.display = dropdown.classList.contains('open') ? 'block' : 'none';
            setupDetachedMenuOptions(dropdown, taskElement, viewType, e.clientX, e.clientY); // Also setup for non-detached menu, pass coords // {{modified}}
        }
    });

    // Close menu when clicking outside (for non-detached)
    document.addEventListener('click', (e) => {
        if (!taskElement.contains(e.target) && dropdown.classList.contains('open')) {
            dropdown.classList.remove('open');
            dropdown.style.display = 'none';
        }
    });
}

// New function to handle clicks on detached menu options
// 需要修改以处理新选项 'restore' 和 'permanent-delete'
function setupDetachedMenuOptions(detachedDropdown, taskElement, viewType, originalMouseX, originalMouseY) { // {{modified}}
    const menuOptions = detachedDropdown.querySelectorAll('.task-menu-option');
    const taskId = taskElement.getAttribute('data-id');

    menuOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);

        newOption.addEventListener('click', (event) => {
            event.stopPropagation();
            const action = newOption.dataset.action; // Get action from data-attribute // {{modified}}

            if (viewType === 'trashed') { 
                if (action === 'restore') { // {{modified}}
                    restoreTask(taskId);
                } else if (action === 'permanent-delete') { // {{modified}}
                    permanentlyDeleteTask(taskId);
                }
            } else { // active or completed
                const task = tasks.find(t => t.id === parseInt(taskId));
                if (!task) {
                     console.warn(`Task ${taskId} not found for menu action.`);
                     // Close and remove the detached menu if it's a detached one
                    if (detachedDropdown.classList.contains('detached-menu') || detachedDropdown.classList.contains('custom-context-menu')) {
            detachedDropdown.remove();
                    } else {
                        detachedDropdown.style.display = 'none';
                        detachedDropdown.classList.remove('open');
                    }
                     return;
                }

                if (action === 'edit') { // {{modified}}
                    openTaskEditorModal(taskId);
                } else if (action === 'modify-tags') { // {{modified}}
                    if (typeof originalMouseX !== 'undefined' && typeof originalMouseY !== 'undefined') {
                        createFloatingTagEditor(taskId, task.tags || [], originalMouseX, originalMouseY);
                    } else {
                        // Fallback if original coordinates are not available (should ideally not happen with current changes)
                        const iconElement = taskElement.querySelector('.task-menu > i');
                        if (iconElement) {
                             const rect = iconElement.getBoundingClientRect();
                             createFloatingTagEditor(taskId, task.tags || [], rect.left, rect.bottom + 5); 
                        } else {
                             createFloatingTagEditor(taskId, task.tags || [], event.clientX, event.clientY); 
                        }
                    }
                } else if (action === 'set-priority') { // {{modified}}
                    if (typeof originalMouseX !== 'undefined' && typeof originalMouseY !== 'undefined') {
                        createPrioritySubMenu(taskId, originalMouseX, originalMouseY);
                    } else {
                         const iconElement = taskElement.querySelector('.task-menu > i');
                         if (iconElement) {
                             const rect = iconElement.getBoundingClientRect();
                             createPrioritySubMenu(taskId, rect.left, rect.bottom + 5);
                         } else {
                             createPrioritySubMenu(taskId, event.clientX, event.clientY);
                         }
                    }
                } else if (action === 'trash') { // {{modified}}
                    trashTask(taskId);
                }
            }

            // Close and remove the detached menu if it's a detached one
            if (detachedDropdown.classList.contains('detached-menu') || detachedDropdown.classList.contains('custom-context-menu')) {
                 detachedDropdown.remove();
            } else {
                detachedDropdown.style.display = 'none';
                detachedDropdown.classList.remove('open');
            }
        });
    });
}

// 切换任务完成状态 (使用本地存储)
async function toggleTaskCompleted(checkboxDiv) {
    const taskElement = checkboxDiv.closest('.task-item');
    if (!taskElement) {
        return;
    }

    const taskId = taskElement.dataset.id;
    const currentTask = tasks.find(t => (t._id && String(t._id) === taskId) || (t.id && String(t.id) === taskId));
    
    if (!currentTask) {
        console.error('找不到要切换状态的任务:', taskId);
        return;
    }
    
    // 切换复选框的视觉状态
    const isNowChecked = !checkboxDiv.classList.contains('checked');
    
    if (isNowChecked) {
        // 应用完成动画
        checkboxDiv.classList.add('checked');
        taskElement.classList.add('completing');
        
        // 更新任务标题样式
        const taskTitle = taskElement.querySelector('.task-title');
        if (taskTitle) {
            taskTitle.style.textDecoration = 'line-through';
            taskTitle.style.color = 'var(--text-muted)';
        }
        
        // 短暂延迟后应用淡出动画
        setTimeout(() => {
            taskElement.classList.add('fade-out');
            
            // 在动画完成后更新任务状态和渲染
            setTimeout(() => {
                // 更新任务状态
                currentTask.status = 'COMPLETED';
                currentTask.completed = true;
                currentTask.completedAt = new Date().toISOString();
                
                // 保存到本地存储
                saveTasks();
                
                // 重新渲染任务列表以反映变化
                renderTasks();
            }, 500); // 等待淡出动画完成
        }, 600); // 等待完成动画结束
    } else {
        // 从已完成状态还原
        checkboxDiv.classList.remove('checked');
        
        // 更新任务标题样式
        const taskTitle = taskElement.querySelector('.task-title');
        if (taskTitle) {
        taskTitle.style.textDecoration = 'none';
            taskTitle.style.color = 'var(--text-color)';
        }
        
        // 立即更新任务状态
        currentTask.status = 'active';
        currentTask.completed = false;
        currentTask.completedAt = null;
        
        // 保存到本地存储
        saveTasks();
        
        // 重新渲染任务列表以反映变化
        renderTasks();
    }
}




// 删除任务
function deleteTask(taskId) {
    
    // 从DOM中移除
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.remove();
    }
    
    // 从数据中移除
    const taskIndex = tasks.findIndex(task => task.id === parseInt(taskId));
    if (taskIndex !== -1) {
        tasks.splice(taskIndex, 1);
        saveTasks();
    }
    
    // 更新任务计数
    updateTaskCount();
    updateCompletionStats();
    updateCompletedMenuCount();
}

// 重置任务输入选项
function resetTaskInputOptions() {
    selectedPriority = '';
    selectedTags = [];
    
    // 重置优先级选择器显示
    updateMainInputPriorityDisplay(); // {{modified}}
    
    // 重置标签显示
    const tagsContainer = document.querySelector('.tags-container');
    if (tagsContainer) tagsContainer.remove();
    
    // 重置日期选择器
    // 不使用已弃用的全局DateSelector对象
    // 清除日期显示元素
    const dateSelector = document.querySelector('.task-date-selector');
    if (dateSelector) {
        const dateText = dateSelector.querySelector('.date-text');
        if (dateText) {
            dateText.textContent = '';
            dateText.classList.remove('has-date');
        }
        dateSelector.setAttribute('data-date', '');
    }
}

// 新的辅助函数：更新主输入栏的优先级显示
function updateMainInputPriorityDisplay() {
    const prioritySelectorDisplay = document.querySelector('.task-input-box .task-priority-selector'); // 主输入框旁的那个
    if (prioritySelectorDisplay) {
        const icon = prioritySelectorDisplay.querySelector('i.fa-flag');
        const priorityTextElement = prioritySelectorDisplay.querySelector('.priority-text');

        if (icon) {
            icon.style.color = getPriorityColor(selectedPriority);
        }
        if (priorityTextElement) {
            if (selectedPriority === 'none' || !selectedPriority) {
                priorityTextElement.textContent = '';
                priorityTextElement.classList.remove('has-priority');
                priorityTextElement.style.backgroundColor = ''; // 清除背景色
                priorityTextElement.style.color = ''; // 清除文字颜色
            } else {
                const priorityLabels = {
                    'high': '高', // 简化文本
                    'medium': '中',
                    'low': '低'
                };
                priorityTextElement.textContent = priorityLabels[selectedPriority] || '';
                priorityTextElement.classList.add('has-priority');
                // 设置优先级标签的背景色和文字颜色
                priorityTextElement.style.backgroundColor = getPriorityBgColor(selectedPriority);
                priorityTextElement.style.color = '#fff'; // 白色文字以确保对比度
            }
        }
    }
}

// 获取今天任务列表元素
function getTodayTaskList() {
    const allSections = document.querySelectorAll('.task-section');
    
    for (let i = 0; i < allSections.length; i++) {
        const sectionTitle = allSections[i].querySelector('.section-title');
        if (sectionTitle) {
            const titleText = sectionTitle.textContent.trim();
            if (titleText.includes('今天') && !titleText.includes('已过期') && !titleText.includes('习惯')) {
                return allSections[i].querySelector('.task-list');
            }
        }
    }
    
    // 如果找不到今天任务列表，返回第一个任务列表
    return document.querySelector('.task-list');
}

// 更新任务计数
function updateTaskCount() {
    // 只计算活动任务的数量 (不包括收集箱和垃圾桶)
    const activeTaskCount = tasks.filter(task => task.status === 'active').length;
    
    // 更新显示计数的元素 (需要确认选择器是否准确)
    const todayCountElement = document.querySelector('#today-container .section-header .section-count:not(.completed-count)'); 
    if (todayCountElement) {
        // This count might be for a specific section within "Today", so be careful.
        // For now, let's assume it's a general count if it exists.
    }
    
    const sidebarTodayCount = document.querySelector('.sidebar .menu-item[data-section="today"] .count');
    if(sidebarTodayCount) {
        sidebarTodayCount.textContent = activeTaskCount; // {{modified}}
    }

    const completedTaskCount = tasks.filter(task => task.status === 'COMPLETED').length; // {{modified}}
    const sidebarCompletedCount = document.querySelector('.sidebar .menu-item[data-section="completed"] .count');
    if(sidebarCompletedCount) {
        sidebarCompletedCount.textContent = completedTaskCount; // {{modified}}
            }
            
    const trashedTaskCount = tasks.filter(task => task.status === 'trashed').length;
    const sidebarTrashCount = document.querySelector('.sidebar .menu-item[data-section="trash"] .count');
    if(sidebarTrashCount) {
        sidebarTrashCount.textContent = trashedTaskCount; // {{modified}}
    }

    // 更新收集箱计数 (现在是想法的数量)
    const ideaCount = ideas.length;
    const sidebarInboxCountUpdated = document.querySelector('.sidebar .menu-item[data-section="inbox"] .count');
    if(sidebarInboxCountUpdated) {
        sidebarInboxCountUpdated.textContent = ideaCount; // {{modified}}
                }

    // 更新侧边栏标签总数
    const uniqueTags = getAllUniqueTags();
    const tagManagerCountElement = document.querySelector('.sidebar .menu-item[data-section="tags-manager"] .count');
    if (tagManagerCountElement) {
        tagManagerCountElement.textContent = uniqueTags.length > 0 ? uniqueTags.length : '0';
                }
}

// 高亮新添加的任务
function highlightNewTask(taskElement) {
    if (!taskElement) return;
    
    // 滚动到任务
    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 添加高亮样式
    taskElement.style.backgroundColor = 'var(--primary-light)';
    
    // 2秒后移除高亮
    setTimeout(() => {
        taskElement.style.backgroundColor = '';
    }, 2000);
}

// 获取优先级颜色
function getPriorityColor(priority) {
    switch (priority) {
        case 'high':
            return 'var(--q1-color)';
        case 'medium':
            return 'var(--q3-color)';
        case 'low':
            return 'var(--q4-color)';
        default:
            return '';
    }
}

// 获取优先级背景颜色
function getPriorityBgColor(priority) {
    switch (priority) {
        case 'high':
            return 'var(--q1-color)';
        case 'medium':
            return 'var(--q3-color)';
        case 'low':
            return 'var(--q4-color)';
        default:
            return '';
    }
}

// 渲染已过期任务
function renderOverdueTasks() {
    // 获取已过期任务区域 - 通过标题文本查找而非位置
    const overdueSections = Array.from(document.querySelectorAll('.task-section')).filter(section => {
        const titleElem = section.querySelector('.section-title');
        return titleElem && titleElem.textContent.trim().includes('已过期');
    });
    
    if (overdueSections.length === 0) {
        console.error("找不到已过期任务区域");
        return;
    }
    
    const overdueSection = overdueSections[0];
    const overdueTaskList = overdueSection.querySelector('.task-list');
    if (!overdueTaskList) {
        console.error("找不到已过期任务列表");
        return;
    }
    
    // 清空当前列表
    overdueTaskList.innerHTML = '';

    // 获取所有已过期任务
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = tasks.filter(task => 
        task.status === 'active' && 
        task.dueDate && 
        new Date(task.dueDate) < today
    );
    
    // 获取当前排序方式
    const sortType = getActiveSortType();
    
    // 按选择的方式排序
    const sortedOverdueTasks = sortTasks(overdueTasks, sortType);
    
    // 更新计数
    const countElement = overdueSection.querySelector('.section-count');
    if (countElement) {
        countElement.textContent = sortedOverdueTasks.length.toString();
    }
    
    // 渲染任务
    if (sortedOverdueTasks.length === 0) {
        overdueTaskList.innerHTML = '<li class="empty-list-message">没有已过期任务</li>';
    } else {
        sortedOverdueTasks.forEach(task => {
            const taskElement = createTaskElement(task, 'active');
            overdueTaskList.appendChild(taskElement);
            
            // 添加右键菜单监听器
            taskElement.addEventListener('contextmenu', (event) => {
                showTaskContextMenu(event, task.id, 'active');
            });
        });
    }

    return sortedOverdueTasks.length; // 返回已过期任务数量
}

// 渲染今天任务
function renderTodayTasks() {
    // 获取今天任务区域 - 通过标题文本查找而非位置
    const todaySections = Array.from(document.querySelectorAll('.task-section')).filter(section => {
        const titleElem = section.querySelector('.section-title');
        return titleElem && 
               titleElem.textContent.trim().includes('今天') && 
               !titleElem.textContent.trim().includes('已过期') &&
               !titleElem.textContent.trim().includes('习惯') &&
               !titleElem.textContent.trim().includes('无DDL');
    });
    
    if (todaySections.length === 0) {
        console.error("找不到今天任务区域");
        return;
    }
    
    const todaySection = todaySections[0];
    const todayTaskList = todaySection.querySelector('.task-list');
    if (!todayTaskList) {
        console.error("找不到今天任务列表");
        return;
    }
    
    // 清空当前列表
    todayTaskList.innerHTML = '';
    
    // 获取今天到期的任务
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTasks = tasks.filter(task => {
        if (task.status !== 'active') return false;
        
        // 必须有截止日期且在今天
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < tomorrow;
    });
    
    // 获取当前排序方式
    const sortType = getActiveSortType();
    
    // 按选择的方式排序
    const sortedTodayTasks = sortTasks(todayTasks, sortType);
    
    // 更新计数
    const countElement = todaySection.querySelector('.section-count');
    if (countElement) {
        countElement.textContent = sortedTodayTasks.length.toString();
    }
    
    // 渲染任务
    if (sortedTodayTasks.length === 0) {
        todayTaskList.innerHTML = '<li class="empty-list-message">没有今天的任务</li>';
    } else {
        sortedTodayTasks.forEach(task => {
            const taskElement = createTaskElement(task, 'active');
            todayTaskList.appendChild(taskElement);
            
            // 添加右键菜单监听器
            taskElement.addEventListener('contextmenu', (event) => {
                showTaskContextMenu(event, task.id, 'active');
            });
        });
    }
    
    return sortedTodayTasks.length; // 返回今天任务数量
}

// 渲染无截止日期任务
function renderNoDeadlineTasks() {
    // 获取无DDL任务区域 - 通过标题文本查找
    const noDeadlineSections = Array.from(document.querySelectorAll('.task-section')).filter(section => {
        const titleElem = section.querySelector('.section-title');
        return titleElem && titleElem.textContent.trim().includes('无DDL');
    });
    
    if (noDeadlineSections.length === 0) {
        console.error("找不到无DDL任务区域");
        return;
    }
    
    const noDeadlineSection = noDeadlineSections[0];
    const noDeadlineList = noDeadlineSection.querySelector('.task-list');
    if (!noDeadlineList) {
        console.error("找不到无DDL任务列表");
        return;
    }
    
    // 清空当前列表
    noDeadlineList.innerHTML = '';
    
    // 获取所有无截止日期的活动任务
    const noDeadlineTasks = tasks.filter(task => 
        task.status === 'active' && !task.dueDate
    );
    
    // 获取当前排序方式
    const sortType = getActiveSortType();
    
    // 按选择的方式排序
    const sortedNoDeadlineTasks = sortTasks(noDeadlineTasks, sortType);
    
    // 更新计数
    const countElement = noDeadlineSection.querySelector('.section-count');
    if (countElement) {
        countElement.textContent = sortedNoDeadlineTasks.length.toString();
    }
    
    // 渲染任务
    if (sortedNoDeadlineTasks.length === 0) {
        noDeadlineList.innerHTML = '<li class="empty-list-message">没有无截止日期的任务</li>';
    } else {
        sortedNoDeadlineTasks.forEach(task => {
            const taskElement = createTaskElement(task, 'active');
            noDeadlineList.appendChild(taskElement);
            
            // 添加右键菜单监听器
            taskElement.addEventListener('contextmenu', (event) => {
                showTaskContextMenu(event, task.id, 'active');
            });
        });
    }
    
    return sortedNoDeadlineTasks.length;
}

// 渲染所有任务
function renderTasks() {
    // 渲染已过期任务、今天任务和无DDL任务
    renderOverdueTasks();
    renderTodayTasks();
    renderNoDeadlineTasks();
    
    // 更新全局任务计数
    updateTaskCount();
}

// 当DOM内容加载完成时初始化任务管理器
document.addEventListener('DOMContentLoaded', initTaskManager);

// 导出API
window.TaskManager = {
    init: initTaskManager,
    addTask: addTask,
    deleteTask: deleteTask,
    toggleCompleted: toggleTaskCompleted,
    getTasks: () => [...tasks],
    saveTasks: saveTasks, // 新增：暴露 saveTasks 方法，供外部调用
    addIdea: addIdea, // 新增：暴露 addIdea 方法
    showTaskContextMenu: showTaskContextMenu // 新增：暴露 showTaskContextMenu 方法
};

// 设置输入框前图标点击事件
function setupInputIcons() {
    // 移除日历和标签图标的处理逻辑
    // 只保留加号图标的相关处理（如有）
    
    // 如果需要为加号添加功能，可以在这里添加：
    const addIcon = document.querySelector('.task-input-container .add-icon');
    if (addIcon) {
        addIcon.addEventListener('click', () => {
            // 点击加号时聚焦到输入框
            const taskInput = document.querySelector('.task-input-container .task-input');
            if (taskInput) {
                taskInput.focus();
            }
        });
    }
}

// 设置侧边栏菜单项点击事件
function setupSidebarMenuItems() {
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    const mainContainers = document.querySelectorAll('#today-container, #completed-container, #trash-container, #inbox-container, #quadrant-container, #tags-manager-container'); // {{modified}}
    
    let lastActiveMenuItem = document.querySelector('.sidebar .menu-item.active') || document.querySelector('.sidebar .menu-item[data-section="today"]');
    // let lastActiveContainerId = lastActiveMenuItem ? (lastActiveMenuItem.dataset.section === 'inbox' ? 'inbox-container' : 
    //                                                 lastActiveMenuItem.dataset.section === 'completed' ? 'completed-container' :
    //                                                 lastActiveMenuItem.dataset.section === 'trash' ? 'trash-container' : 
    //                                                 lastActiveMenuItem.dataset.section === 'quadrant' ? 'quadrant-container' : 'today-container') : 'today-container'; // Added quadrant
    // 更通用的 lastActiveContainerId 初始化：
    let lastActiveContainerId = 'today-container'; // 默认
    if (lastActiveMenuItem) {
        const section = lastActiveMenuItem.dataset.section;
        if (section === 'inbox') lastActiveContainerId = 'inbox-container';
        else if (section === 'completed') lastActiveContainerId = 'completed-container';
        else if (section === 'trash') lastActiveContainerId = 'trash-container';
        else if (section === 'quadrant') lastActiveContainerId = 'quadrant-container';
        else if (section === 'tags-manager') lastActiveContainerId = 'tags-manager-container'; // {{modified}}
        else if (section === 'today') lastActiveContainerId = 'today-container'; // 确保 'today' 也被处理
    }

    // Initial setup based on last active or default to today
    mainContainers.forEach(container => {
        // container.style.display = container.id === lastActiveContainerId ? 'block' : 'none'; // Original
        if (container.id === lastActiveContainerId) {
            if (container.id === 'quadrant-container') {
                container.style.display = 'flex';
            } else if (container.id === 'tags-manager-container') {
                container.style.display = 'block'; // 使用block布局，内部的tags-manager-layout会使用flex
            } else {
                container.style.display = 'block';
            }
        } else {
            container.style.display = 'none';
        }
    });
    if (lastActiveMenuItem) {
        menuItems.forEach(mi => mi.classList.remove('active'));
        lastActiveMenuItem.classList.add('active');
        // Trigger initial render for the active container
        const initialItemText = lastActiveMenuItem.querySelector('span').textContent.trim();
        if (initialItemText === '今天') { renderTasks(); }
        else if (initialItemText === '已完成') { renderCompletedTasks(); }
        else if (initialItemText === '收集箱') { renderIdeas(); }
        else if (initialItemText === '垃圾桶') { renderTrashedTasks(); }
        else if (initialItemText === '四象限视图') { // Added for quadrant
            if (typeof refreshQuadrantTasks === 'function') {
                refreshQuadrantTasks();
            }
        }
    }
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            const itemText = item.querySelector('span').textContent.trim();
            let targetContainerId = '';
            
            if (itemText === '今天') {
                targetContainerId = 'today-container';
                renderTasks();
            } else if (itemText === '已完成') {
                targetContainerId = 'completed-container';
                renderCompletedTasks();
            } else if (itemText === '收集箱') {
                targetContainerId = 'inbox-container'; // inbox-container 是新的想法盒子容器ID
                renderIdeas(); // 调用 renderIdeas 而不是 renderInboxTasks
            } else if (itemText === '垃圾桶') {
                targetContainerId = 'trash-container';
                renderTrashedTasks();
            } else if (itemText === '四象限视图') { // Logic for quadrant view
                targetContainerId = 'quadrant-container';
                if (typeof refreshQuadrantTasks === 'function') {
                    refreshQuadrantTasks();
                }
            } else if (item.dataset.section === 'tags-manager') { 
                targetContainerId = 'tags-manager-container'; 
                if (typeof renderTagsManager === 'function') { 
                    renderTagsManager(); 
                }
            }

            mainContainers.forEach(container => {
                // container.style.display = container.id === targetContainerId ? 'block' : 'none'; // Original
                if (container.id === targetContainerId) {
                    // 标签管理器容器使用flex还是block取决于其内部布局需求，CSS中 .tags-manager-layout 是 flex
                    // 为了保持一致性，且父容器 task-section-container 通常是 block，这里可以设为 block
                    // 如果 #tags-manager-container 本身需要 flex 特性，则可以设为 flex
                    if (container.id === 'quadrant-container') {
                        container.style.display = 'flex';
                    } else if (container.id === 'tags-manager-container') {
                        container.style.display = 'block'; // 使用block布局，内部的tags-manager-layout会使用flex
                    } else {
                        container.style.display = 'block';
                    }
                } else {
                    container.style.display = 'none';
                }
            });
            lastActiveContainerId = targetContainerId; 
            localStorage.setItem('lastActiveSidebarSection', item.dataset.section); 
        });
    });
    
    // On page load, try to restore the last active section from localStorage
    const savedSection = localStorage.getItem('lastActiveSidebarSection');
    let itemToClick = null;
    if (savedSection) {
        itemToClick = document.querySelector(`.sidebar .menu-item[data-section="${savedSection}"]`);
    }
    
    // If a saved section is found and it's not the default active one, click it.
    // Otherwise, if no saved section, and default isn't already active, click default.
    if (itemToClick && !itemToClick.classList.contains('active')) {
        itemToClick.click();
    } else if (!itemToClick && lastActiveMenuItem && !lastActiveMenuItem.classList.contains('active')) {
         // This case handles if the default (today) was not set as active initially by querySelector 
         // (e.g. if no .active class was present in HTML at load)
        lastActiveMenuItem.click(); 
    } else if (!document.querySelector('.sidebar .menu-item.active')) {
        // Fallback: if absolutely nothing is active, click the 'today' item.
        const todayItem = document.querySelector('.sidebar .menu-item[data-section="today"]');
        if (todayItem) todayItem.click();
    }
}

// 重置今天页面的过滤器状态
function resetTodayFilters() {
    // 获取过滤器按钮
    const filterButtons = document.querySelectorAll('.filter-btn:not(.completed-filter)');
    const sortButtons = document.querySelectorAll('.sort-btn:not(.completed-sort)');
    
    // 重置过滤器状态 - 默认显示"所有"
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    // 重置排序状态 - 默认按日期排序
    sortButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === 'date') {
            btn.classList.add('active');
        }
    });
}

// 设置已完成页面筛选
function setupCompletedFilters() {
    const filterButtons = document.querySelectorAll('.completed-filter');
    const sortButtons = document.querySelectorAll('.completed-sort');
    
    // 设置过滤按钮点击事件
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除其他按钮的激活状态
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // 激活当前按钮
            btn.classList.add('active');
            
            // 应用过滤和排序
            renderCompletedTasks();
        });
    });
    
    // 设置排序按钮点击事件
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除其他按钮的激活状态
            sortButtons.forEach(b => b.classList.remove('active'));
            
            // 激活当前按钮
            btn.classList.add('active');
            
            // 应用排序
            renderCompletedTasks();
        });
    });
    
    // 设置搜索事件
    const searchInput = document.getElementById('completed-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCompletedTasks();
        });
    }
}

// 设置清空已完成任务功能
function setupClearCompleted() {
    const clearBtn = document.getElementById('clear-completed');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const completedTasksCount = tasks.filter(task => task.status === 'COMPLETED').length; // {{modified}}
            if (completedTasksCount === 0) {
                alert('没有已完成的任务可清空。');
                return;
            }

            showGenericConfirmModal(
                '确认清空已完成任务',
                `确定要永久删除所有 ${completedTasksCount} 个已完成任务吗？此操作无法恢复。`,
                async () => {
                    tasks = tasks.filter(task => task.status !== 'COMPLETED'); // {{modified}}
                saveTasks();
                    renderCompletedTasks(); // Refresh the completed tasks view
                    updateTaskCount(); // Update sidebar counts
                    updateCompletionStats(); // Update stats and menu counts
                    console.log('All completed tasks permanently deleted.');
                }
            );
        });
    }
}

// 过滤已完成任务
function filterCompletedTasks() {
    // 获取搜索关键词
    const searchTerm = document.getElementById('completed-search')?.value.toLowerCase() || '';
    
    // 获取当前的过滤器类型
    const activeFilter = document.querySelector('.completed-filter.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';
    
    // 过滤已完成任务 (基于 status)
    let filteredTasks = tasks.filter(task => task.status === 'COMPLETED'); // {{modified}}
    
    // 应用搜索过滤
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => 
            task.text.toLowerCase().includes(searchTerm) || 
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    // 应用时间范围过滤
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 设为本周的周日
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    switch (filterType) {
        case 'today':
            filteredTasks = filteredTasks.filter(task => {
                const completedDate = new Date(task.completedAt || task.createdAt);
                return completedDate.toDateString() === today.toDateString();
            });
            break;
        case 'week':
            filteredTasks = filteredTasks.filter(task => {
                const completedDate = new Date(task.completedAt || task.createdAt);
                return completedDate >= weekStart;
            });
            break;
        case 'month':
            filteredTasks = filteredTasks.filter(task => {
                const completedDate = new Date(task.completedAt || task.createdAt);
                return completedDate >= monthStart;
            });
            break;
    }
    
    return filteredTasks;
}

// 排序已完成任务
function sortCompletedTasks(taskList) {
    const activeSort = document.querySelector('.completed-sort.active');
    const sortType = activeSort ? activeSort.dataset.sort : 'date';
    
    const sorted = [...taskList];
    
    switch (sortType) {
        case 'priority':
            // 优先级排序：高 > 中 > 低 > 无
            const priorityOrder = { high: 1, medium: 2, low: 3, none: 4, '': 4 };
            return sorted.sort((a, b) => {
                return priorityOrder[a.priority || ''] - priorityOrder[b.priority || ''];
            });
        case 'date':
        default:
            // 完成日期排序：最新的排在前面
            return sorted.sort((a, b) => {
                const dateA = new Date(a.completedAt || a.createdAt);
                const dateB = new Date(b.completedAt || b.createdAt);
                return dateB - dateA; // 倒序排列
            });
    }
}

// 渲染已完成任务
function renderCompletedTasks() {
    // 获取已完成任务列表容器
    const completedTaskList = document.getElementById('completed-task-list');
    if (!completedTaskList) {
        console.error("错误！未找到 ID 为 'completed-task-list' 的容器。");
        return;
    }
    
    // 过滤和排序任务
    const filteredTasks = filterCompletedTasks();
    const sortedTasks = sortCompletedTasks(filteredTasks);
    
    // 清空当前任务列表
    completedTaskList.innerHTML = '';
    
    // 添加过滤后的任务
    if (sortedTasks.length === 0) {
        completedTaskList.innerHTML = '<li class="empty-list-message">没有已完成的任务</li>';
    } else {
    sortedTasks.forEach(task => {
        const taskElement = createTaskElement(task, 'completed');
        completedTaskList.appendChild(taskElement);
        
        // 添加右键菜单监听器 (for completed tasks)
        taskElement.addEventListener('contextmenu', (event) => {
            showTaskContextMenu(event, task.id, 'completed');
        });
    });
    }
    
    // 更新任务计数
    const countElement = document.querySelector('#completed-container .section-count');
    if (countElement) {
        countElement.textContent = sortedTasks.length;
    }
    
    // 更新完成统计
    updateCompletionStats();
}

// 更新完成统计信息
function updateCompletionStats() {
    // 获取所有已完成任务 (基于 status)
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED'); // {{modified}}
    
    // 计算今日完成数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompleted = completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt || task.createdAt);
        return completedDate.toDateString() === today.toDateString();
    }).length;
    
    // 计算本周完成数量
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 设为本周的周日
    const weekCompleted = completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt || task.createdAt);
        return completedDate >= weekStart;
    }).length;
    
    // 计算本月完成数量
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthCompleted = completedTasks.filter(task => {
        const completedDate = new Date(task.completedAt || task.createdAt);
        return completedDate >= monthStart;
    }).length;
    
    // 设置统计值
    document.getElementById('today-completed-count').textContent = todayCompleted;
    document.getElementById('week-completed-count').textContent = weekCompleted;
    document.getElementById('month-completed-count').textContent = monthCompleted;
    document.getElementById('total-completed-count').textContent = completedTasks.length;
}

// 更新左侧菜单已完成数量
function updateCompletedMenuCount() {
    const completedCount = tasks.filter(task => task.status === 'COMPLETED').length; // {{modified}}
    
    // 查找已完成菜单项（第三个菜单项）
    const completedMenuItem = document.querySelector('.sidebar .menu-item:nth-child(4)');
    
    if (completedMenuItem && completedMenuItem.querySelector('span').textContent.trim() === '已完成') {
        // 检查是否已有计数元素
        let countElement = completedMenuItem.querySelector('.count');
        
        // 如果没有，则创建一个
        if (!countElement) {
            countElement = document.createElement('span');
            countElement.className = 'count';
            completedMenuItem.appendChild(countElement);
        }
        
        // 更新计数
        countElement.textContent = completedCount; // {{modified}}
    }
}

// 扩展 querySelector 以支持包含文本的选择器
Document.prototype.querySelector = (function(originalDocumentQuerySelector) {
    return function(selector) {
        if (selector.includes(':contains(')) {
            // 提取 :contains() 中的文本
            const regex = /:contains\((['"])(.*?)\1\)/;
            const match = selector.match(regex);
            
            if (match && match[2]) {
                const containsText = match[2];
                const newSelector = selector.replace(regex, '');
                
                // 获取所有可能的元素
                const elements = this.querySelectorAll(newSelector);
                
                // 找到包含指定文本的元素
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].textContent.includes(containsText)) {
                        return elements[i];
                    }
                }
                
                return null;
            }
        }
        
        return originalDocumentQuerySelector.call(this, selector);
    };
})(Document.prototype.querySelector);

Element.prototype.querySelector = (function(originalElementQuerySelector) {
    return function(selector) {
        if (selector.includes(':contains(')) {
            // 提取 :contains() 中的文本
            const regex = /:contains\((['"])(.*?)\1\)/;
            const match = selector.match(regex);
            
            if (match && match[2]) {
                const containsText = match[2];
                const newSelector = selector.replace(regex, '');
                
                // 获取所有可能的元素
                const elements = this.querySelectorAll(newSelector);
                
                // 找到包含指定文本的元素
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].textContent.includes(containsText)) {
                        return elements[i];
                    }
                }
                
                return null;
            }
        }
        
        return originalElementQuerySelector.call(this, selector);
    };
})(Element.prototype.querySelector); 

// 将任务移至垃圾桶 (逻辑删除)
async function trashTask(taskId) { 
    const taskIdStr = String(taskId);
    
    const taskIndex = tasks.findIndex(t => String(t.id) === taskIdStr);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].status = 'trashed';
        tasks[taskIndex].trashedAt = new Date().toISOString(); // 可选：记录删除时间
        saveTasks();
        await loadTasks(); // 刷新UI

    } else {
        console.warn(`u4efbu52a1 ${taskIdStr} u672au627eu5230uff0cu65e0u6cd5u79fbu52a8u5230u5783u573eu6876`);
    }
}

// 从垃圾桶恢复任务
function restoreTask(taskId) {
    console.log(`Restoring task ${taskId} from trash`);
    
    const taskIdNum = parseInt(taskId);
    const taskIndex = tasks.findIndex(task => task.id === taskIdNum);
    
    if (taskIndex !== -1) {
        // 更新任务状态
        tasks[taskIndex].status = 'active';
        
        // 保存到本地存储
        saveTasks();

        // 重新渲染
        renderTrashedTasks();
        
        // 更新统计
        updateTaskCount();
        updateCompletionStats();
        updateCompletedMenuCount();
        
        console.log(`Task ${taskId} restored from trash`);
    } else {
        console.warn(`Task ${taskId} not found, cannot restore from trash`);
    }
}

// 永久删除任务 (物理删除)
function permanentlyDeleteTask(taskId) {
    console.log(`Permanently deleting task ${taskId}`);
    
    // 从垃圾桶中移除任务
    deleteTask(taskId);
    
    console.log(`Task ${taskId} permanently deleted`);
}

// 渲染垃圾桶中的任务
function renderTrashedTasks() {
    const trashListContainer = document.getElementById('trash-list');
    if (!trashListContainer) {
        console.error("Trash list container ('#trash-list') not found.");
        return;
    }

    trashListContainer.innerHTML = ''; // 清空现有列表

    const trashedTasks = tasks.filter(task => task.status === 'trashed');

    if (trashedTasks.length === 0) {
        trashListContainer.innerHTML = '<li class="empty-list-message">垃圾桶是空的</li>';
    } else {
        // 按删除时间倒序排序 (最新的在前面)
        trashedTasks.sort((a, b) => new Date(b.trashedAt) - new Date(a.trashedAt));

        trashedTasks.forEach(task => {
            // 使用修改后的 createTaskElement，传入 'trashed' 类型
            const taskElement = createTaskElement(task, 'trashed'); 
            trashListContainer.appendChild(taskElement);

            // 添加右键菜单监听器
            taskElement.addEventListener('contextmenu', (event) => {
                showTaskContextMenu(event, task.id, 'trashed');
            });
        });
    }

    // 更新垃圾桶计数 (如果需要显示)
    // const trashCount = trashedTasks.length;
    // console.log(`Trash count: ${trashCount}`);
}

// 关闭当前打开的自定义右键菜单
function closeContextMenu() {
    // 关闭所有使用 .custom-context-menu 类的菜单
    const existingMenus = document.querySelectorAll('.custom-context-menu');
    existingMenus.forEach(menu => menu.remove());
    
    // 移除全局点击监听器
    document.removeEventListener('click', closeContextMenuOnClickOutside, true);
}

// 全局点击事件处理，用于关闭右键菜单
function closeContextMenuOnClickOutside(event) {
    // 检查点击是否发生在任何自定义右键菜单内部
    const clickedInsideMenu = event.target.closest('.custom-context-menu');
    
    // 如果点击事件发生在菜单之外，则关闭菜单
    if (!clickedInsideMenu) {
        closeContextMenu();
    }
}

// 通用的上下文菜单定位函数
function positionContextMenu(menu, event) {
    // 确保菜单可见以获取其尺寸
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    
    // 获取菜单尺寸和视口信息
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 5; // 边缘安全距离
    
    // 初始位置设为鼠标点击位置
    let top = event.clientY;
    let left = event.clientX;
    
    // 调整位置，确保菜单不会超出视口边界
    if (left + menuWidth > viewportWidth - buffer) {
        left = viewportWidth - menuWidth - buffer;
    }
    if (top + menuHeight > viewportHeight - buffer) {
        top = viewportHeight - menuHeight - buffer;
    }
    
    // 确保菜单不会显示在视口外
    if (left < buffer) left = buffer;
    if (top < buffer) top = buffer;
    
    // 应用计算后的位置
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = 'visible';
    
    return { top, left }; // 返回计算后的位置，以便调用者使用
}

// 显示活动/已完成任务的右键菜单
function showTaskContextMenu(event, taskId, status) {
    event.preventDefault();
    const originalMouseX = event.clientX;
    const originalMouseY = event.clientY;
    closeContextMenu(); // 关闭任何已存在的菜单

    const menu = document.createElement('div');
    menu.className = 'custom-context-menu'; // 使用通用菜单类

    // 创建菜单选项
    let options = [];

    if (status === 'active' || status === 'completed') {
        // 检查是否在四象限视图中
        const isQuadrantView = event.target.closest('#quadrant-container') !== null;

        options = [
            { label: '编辑', icon: 'fas fa-edit', action: () => openTaskEditorModal(taskId) },
            { 
                label: '修改标签', 
                icon: 'fas fa-tags', 
                action: () => { 
                    const task = tasks.find(t => t.id === parseInt(taskId)); 
                    if (task) { 
                        createFloatingTagEditor(taskId, task.tags || [], originalMouseX, originalMouseY);
                    } 
                } 
            }
        ];

        // 如果不是四象限视图，添加设置优先级选项
        if (!isQuadrantView) {
            options.push({ 
                label: '设置优先级', 
                icon: 'fas fa-flag', 
                action: (e) => createPrioritySubMenu(taskId, e ? e.clientX : originalMouseX, e ? e.clientY : originalMouseY) 
            });
        }

        // 添加移至垃圾桶选项
        options.push({ label: '移至垃圾桶', icon: 'fas fa-trash-alt', action: () => trashTask(taskId), isDelete: true });
    } else if (status === 'trashed') {
        options = [
            { label: '恢复任务', icon: 'fas fa-undo-alt', action: () => restoreTask(taskId) },
            { label: '彻底删除', icon: 'fas fa-times-circle', action: () => permanentlyDeleteTask(taskId), isDelete: true }
        ];
    } else if (status === 'inbox') {
        // 旧的收集箱任务的右键菜单逻辑
        console.warn(`Context menu opened for deprecated status 'inbox' on task ${taskId}`);
        options = [
            { label: '处理 (旧)', icon: 'fas fa-cogs', action: () => console.log('Process (deprecated) inbox task:', taskId) },
            { label: '移至垃圾桶', icon: 'fas fa-trash-alt', action: () => trashTask(taskId), isDelete: true }
        ];
    }

    options.forEach(opt => {
        const optionElement = document.createElement('div');
        optionElement.className = 'context-menu-option';
        if (opt.isDelete) {
            optionElement.classList.add('delete'); // 为删除操作添加特殊样式
        }
        if (opt.label === '修改标签') {
            optionElement.classList.add('context-menu-option-tags');
        }
        optionElement.innerHTML = `<i class="${opt.icon}"></i> ${opt.label}`;
        
        // 修改点：针对"设置优先级"选项，不立即关闭主菜单，因为它要打开子菜单
        if (opt.label === '设置优先级') {
            optionElement.onclick = (event) => { 
                opt.action(event); // 执行 createPrioritySubMenu，它自己会处理旧菜单关闭和新子菜单打开
                // closeContextMenu(); //  <--- 原本这行会关闭刚打开的子菜单，已移除
            };
        } else {
            // 其他菜单项保持原有逻辑
        optionElement.onclick = (event) => { 
            opt.action(event); 
                closeContextMenu(); // 操作后关闭菜单
        };
        }
        menu.appendChild(optionElement);
    });

    document.body.appendChild(menu);
    
    // 使用通用的菜单定位函数
    positionContextMenu(menu, event);
    menu.style.zIndex = '1250';

    // 添加全局点击监听器以关闭菜单
    setTimeout(() => {
        document.addEventListener('click', closeContextMenuOnClickOutside, true);
    }, 0);
}

// 新增：浮动标签编辑器
function createFloatingTagEditor(taskId, currentTags, x, y) {
    // 0. 如果已存在编辑器，先移除
    closeFloatingTagEditor();

    // 1. 创建编辑器主体
    const editor = document.createElement('div');
    editor.id = 'floating-tag-editor-active'; // 给一个ID方便查找和移除
    editor.className = 'floating-tag-editor'; // 使用已定义的CSS类
    editor.style.position = 'absolute'; // 确保是 absolute 或 fixed

    // 2. 编辑器内容 (更完整的结构)
    editor.innerHTML = `
        <div class="floating-tag-editor-header">
            <span>修改标签</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="floating-tag-editor-content">
            <div class="selected-tags-display">
                <!-- 当前标签将在这里通过 JS 添加 -->
            </div>
            <input type="text" class="tag-search-input" placeholder="输入或选择标签...">
            <div class="tag-suggestions-list">
                <!-- 标签建议将在这里显示 -->
            </div>
        </div>
        <div class="floating-tag-editor-footer">
            <button class="cancel-btn">取消</button>
            <button class="save-btn primary-button">保存</button>
        </div>
    `;

    document.body.appendChild(editor);

    // --- 获取编辑器内部元素 ---
    const header = editor.querySelector('.floating-tag-editor-header'); // 用于拖动
    const closeButton = editor.querySelector('.floating-tag-editor-header .close-btn');
    const selectedTagsContainer = editor.querySelector('.selected-tags-display');
    const searchInput = editor.querySelector('.tag-search-input');
    const suggestionsListContainer = editor.querySelector('.tag-suggestions-list');
    const saveButton = editor.querySelector('.floating-tag-editor-footer .save-btn');
    const cancelButton = editor.querySelector('.floating-tag-editor-footer .cancel-btn');
    
    let tagsForEditor = [...currentTags]; // 本地副本，用于编辑
    let allAvailableTags = getAllUniqueTags(); // 获取所有唯一标签用于建议

    // --- 渲染初始状态 ---
    renderSelectedTagsInEditor(tagsForEditor, selectedTagsContainer, tagsForEditor, searchInput, suggestionsListContainer, allAvailableTags); // 传递所需变量
    renderTagSuggestions(allAvailableTags, '', suggestionsListContainer, tagsForEditor);

    // --- 事件监听器 ---
    const closeEditorAndCleanup = () => {
        editor.remove();
        document.removeEventListener('click', handleClickOutsideTagEditor, true);
        // 移除拖动事件监听器 (如果添加了)
        if (header) {
            header.removeEventListener('mousedown', onDragStart);
        }
    };

    closeButton.onclick = closeEditorAndCleanup;
    cancelButton.onclick = closeEditorAndCleanup;

    saveButton.onclick = () => {
        const taskToUpdate = tasks.find(t => t.id === parseInt(taskId));
        if (taskToUpdate) {
            taskToUpdate.tags = [...tagsForEditor]; // 更新任务的标签
            saveTasks();
            renderTasks(); // 或更精细的更新逻辑
            // 可能还需要更新特定视图，例如任务详情视图如果打开了
        }
        closeEditorAndCleanup();
    };

    searchInput.addEventListener('input', () => {
        renderTagSuggestions(allAvailableTags, searchInput.value, suggestionsListContainer, tagsForEditor);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTagValue = searchInput.value.trim();
            if (newTagValue) {
                const suggestionToClick = suggestionsListContainer.querySelector(`.tag-suggestion-item[data-tag="${newTagValue}"]`) || 
                                          suggestionsListContainer.querySelector('.create-new-tag');
                if (suggestionToClick) {
                    suggestionToClick.click(); // 模拟点击匹配的建议或创建按钮
                } else if (!tagsForEditor.includes(newTagValue)) { // 如果没有建议匹配且标签未被选中，则直接添加
                    tagsForEditor.push(newTagValue);
                    if (!allAvailableTags.includes(newTagValue)) {
                        allAvailableTags.push(newTagValue);
                        allAvailableTags.sort();
                    }
                    renderSelectedTagsInEditor(tagsForEditor, selectedTagsContainer, tagsForEditor, searchInput, suggestionsListContainer, allAvailableTags);
                    searchInput.value = '';
                    renderTagSuggestions(allAvailableTags, '', suggestionsListContainer, tagsForEditor);
                } else { // 标签已存在于选中列表
                     searchInput.value = ''; // 清空输入
                     renderTagSuggestions(allAvailableTags, '', suggestionsListContainer, tagsForEditor); // 刷新建议
                }
                searchInput.focus();
            }
        }
    });
    
    suggestionsListContainer.addEventListener('click', function(event) {
        const target = event.target.closest('.tag-suggestion-item');
        if (!target) return;

        const tagValue = target.dataset.tag;

        if (target.classList.contains('create-new-tag')) {
            if (tagValue && !tagsForEditor.includes(tagValue)) {
                tagsForEditor.push(tagValue);
                if (!allAvailableTags.includes(tagValue)) {
                    allAvailableTags.push(tagValue);
                    allAvailableTags.sort();
                }
            }
        } else if (tagValue) {
            if (!tagsForEditor.includes(tagValue)) {
                tagsForEditor.push(tagValue);
            } else {
                // 如果标签已在 selectedTags 中，则移除 (实现切换效果)
                // tagsForEditor = tagsForEditor.filter(t => t !== tagValue);
                // 或者根据需求，点击已选中的建议标签不执行任何操作，或者高亮显示等
            }
        }
        renderSelectedTagsInEditor(tagsForEditor, selectedTagsContainer, tagsForEditor, searchInput, suggestionsListContainer, allAvailableTags);
        searchInput.value = '';
        renderTagSuggestions(allAvailableTags, '', suggestionsListContainer, tagsForEditor);
        searchInput.focus();
    });


    // --- 定位编辑器 ---
    editor.style.display = 'flex'; // 先设置为flex以计算尺寸
    const menuHeight = editor.offsetHeight;
    const menuWidth = editor.offsetWidth;
    editor.style.display = 'none'; // 暂时隐藏以避免闪烁

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 10;

    let topPos = y;
    let leftPos = x;

    if (leftPos + menuWidth > viewportWidth - buffer) {
        leftPos = viewportWidth - menuWidth - buffer;
    }
    if (topPos + menuHeight > viewportHeight - buffer) {
        topPos = viewportHeight - menuHeight - buffer;
    }
    if (leftPos < buffer) leftPos = buffer;
    if (topPos < buffer) topPos = buffer;
    
    editor.style.top = `${topPos}px`;
    editor.style.left = `${leftPos}px`;
    editor.style.display = 'flex'; // 最终显示
    editor.style.zIndex = '1250'; // 确保在其他元素之上

    searchInput.focus();

    // --- 点击外部关闭 ---
    // handleClickOutsideTagEditor 将由 closeFloatingTagEditor 中的 removeEventListener 清理
    setTimeout(() => {
        document.addEventListener('click', handleClickOutsideTagEditor, true);
    }, 0);

    // --- 拖动逻辑 (可选) ---
    let offsetX, offsetY, isDragging = false;
    if (header) {
        header.style.cursor = 'move';
        header.addEventListener('mousedown', onDragStart);
    }

    function onDragStart(e) {
        // 防止在输入框或按钮上开始拖动
        if (e.target.closest('input, button, .selected-tags-display, .tag-suggestions-list')) {
            return;
        }
        isDragging = true;
        offsetX = e.clientX - editor.offsetLeft;
        offsetY = e.clientY - editor.offsetTop;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
        editor.classList.add('dragging'); // 可选：用于拖动时的样式
    }

    function onDrag(e) {
        if (!isDragging) return;
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // 保持在视口内 (基本版)
        const maxLeft = viewportWidth - editor.offsetWidth - buffer;
        const maxTop = viewportHeight - editor.offsetHeight - buffer;
        newLeft = Math.max(buffer, Math.min(newLeft, maxLeft));
        newTop = Math.max(buffer, Math.min(newTop, maxTop));

        editor.style.left = `${newLeft}px`;
        editor.style.top = `${newTop}px`;
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
        editor.classList.remove('dragging');
    }
}

// 新增：关闭浮动标签编辑器的函数 (确保这个函数存在且被正确调用)
function closeFloatingTagEditor() {
    const existingEditor = document.getElementById('floating-tag-editor-active');
    if (existingEditor) {
        // 在移除编辑器之前，尝试移除其特定的拖动事件监听器 (如果添加了)
        const header = existingEditor.querySelector('.floating-tag-editor-header');
        if (header && typeof onDragStart === 'function') { // onDragStart 可能未定义如果编辑器创建失败
           // header.removeEventListener('mousedown', onDragStart); // onDragStart 不在全局作用域
        }
        // 也需要移除 document 上的 mousemove 和 mouseup (如果拖动正在进行)
        // document.removeEventListener('mousemove', onDrag);
        // document.removeEventListener('mouseup', onDragEnd);

        existingEditor.remove();
        document.removeEventListener('click', handleClickOutsideTagEditor, true);
    }
}

// 新增：处理点击编辑器外部的事件 (确保这个函数存在)
function handleClickOutsideTagEditor(event) {
    const editor = document.getElementById('floating-tag-editor-active');
    // 同时检查点击目标是否为打开此编辑器的右键菜单项的特定部分
    // 这有助于防止因为右键菜单项本身在DOM中移动或变化导致的意外关闭
    const isContextTrigger = event.target.closest('.context-menu-option-tags'); 
                                 // event.target.closest('.task-menu-option[data-action="modify-tags"]'); // 更精确

    if (editor && !editor.contains(event.target) && !isContextTrigger) {
        // 如果点击的不是编辑器本身，也不是触发编辑器的那个特定菜单项，则关闭
        closeFloatingTagEditor();
    }
}

// --- 辅助函数 for createFloatingTagEditor ---
function renderSelectedTagsInEditor(tagsToRender, container, tagsForEditorRef, searchInputRef, suggestionsListContainerRef, allAvailableTagsRef) {
    container.innerHTML = ''; // 清空
    if (tagsToRender.length === 0) {
        //  保持为空，让placeholder在input中显示
    } else {
        tagsToRender.forEach(tag => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip';
            chip.textContent = tag;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-chip';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                // 从 tagsForEditorRef (它是 createFloatingTagEditor 中的 tagsForEditor) 中移除标签
                const index = tagsForEditorRef.indexOf(tag);
                if (index > -1) {
                    tagsForEditorRef.splice(index, 1);
                }
                // 使用更新后的 tagsForEditorRef 重新渲染选中的标签
                renderSelectedTagsInEditor(tagsForEditorRef, container, tagsForEditorRef, searchInputRef, suggestionsListContainerRef, allAvailableTagsRef);
                // 刷新建议列表，因为一个标签现在变为可选状态
                renderTagSuggestions(allAvailableTagsRef, searchInputRef.value, suggestionsListContainerRef, tagsForEditorRef);
            };
            chip.appendChild(removeBtn);
            container.appendChild(chip);
        });
    }
}

function renderTagSuggestions(allTags, searchTerm, suggestionsContainer, currentlySelectedTags) {
    suggestionsContainer.innerHTML = ''; // 清空
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    
    const filteredTags = allTags.filter(tag => 
        !currentlySelectedTags.includes(tag) && 
        (lowerSearchTerm === '' || tag.toLowerCase().includes(lowerSearchTerm))
    );

    filteredTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'tag-suggestion-item';
        item.textContent = tag;
        item.dataset.tag = tag;
        suggestionsContainer.appendChild(item);
    });

    if (lowerSearchTerm && !allTags.includes(lowerSearchTerm) && !currentlySelectedTags.includes(lowerSearchTerm)) {
        const createItem = document.createElement('div');
        createItem.className = 'tag-suggestion-item create-new-tag';
        createItem.innerHTML = `创建新标签: "<strong>${searchTerm}</strong>"`;
        createItem.dataset.tag = searchTerm; // 将要创建的标签名存在这里
        suggestionsContainer.appendChild(createItem);
    }
    
    if (filteredTags.length === 0 && (!lowerSearchTerm || allTags.includes(lowerSearchTerm) || currentlySelectedTags.includes(lowerSearchTerm))) {
        if (! (lowerSearchTerm && !allTags.includes(lowerSearchTerm) && !currentlySelectedTags.includes(lowerSearchTerm)) ) {
             suggestionsContainer.innerHTML = '<div class="no-suggestions">无可用标签建议</div>';
        }
    }
}

function getAllUniqueTags() {
    const allTagsSet = new Set();
    // 从独立标签列表添加标签
    allAvailableTagsList.forEach(tag => allTagsSet.add(tag));

    tasks.forEach(task => {
        if (task.tags) {
            task.tags.forEach(tag => allTagsSet.add(tag));
        }
    });
    ideas.forEach(idea => { // 也从想法的子任务中收集标签
        if (idea.subTasks) {
            idea.subTasks.forEach(subTask => {
                if (subTask.tags) {
                    subTask.tags.forEach(tag => allTagsSet.add(tag));
                }
            });
        }
    });
    return Array.from(allTagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // 确保排序一致
}

// 清空垃圾桶
function emptyTrash() {
    const trashedItems = [];
    tasks.forEach((task, index) => {
        if (task.status === 'trashed') {
            trashedItems.push({ index, id: task.id, text: task.text }); // Store text for message
        }
    });

    const count = trashedItems.length;
    if (count === 0) {
        alert('垃圾桶已经是空的！'); 
        return; 
    }
    
    showGenericConfirmModal(
        '确认清空垃圾桶',
        `垃圾桶中的 ${count} 个任务将被永久删除。确认清空垃圾箱？`,
        async () => {
            // performEmptyTrash was an inner function, let's define its core logic here
            // Sort by index descending to avoid issues when splicing
            trashedItems.sort((a, b) => b.index - a.index);
            trashedItems.forEach(item => {
                const taskIndex = tasks.findIndex(t => t.id === item.id); // Re-find index just in case
                if (taskIndex !== -1) {
                     tasks.splice(taskIndex, 1);
                }
            });

            saveTasks();
            renderTrashedTasks(); // Refresh the trash view
            updateTaskCount();    // Update sidebar counts
            console.log('Trash emptied successfully.');
        }
    );
}

// 新增：通用确认模态框显示函数
function showGenericConfirmModal(title, message, confirmCallback) {
    const modalOverlay = document.getElementById('generic-task-confirm-modal');
    const modalTitleElement = document.getElementById('generic-confirm-modal-title'); // Renamed variable
    const modalMessageElement = document.getElementById('generic-confirm-modal-message'); // Renamed variable
    const confirmBtn = document.getElementById('generic-confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('generic-confirm-modal-cancel-btn');
    const closeBtn = document.getElementById('generic-confirm-modal-close-btn');

    if (!modalOverlay || !modalTitleElement || !modalMessageElement || !confirmBtn || !cancelBtn || !closeBtn) {
        console.error('Generic confirmation modal elements not found! IDs: generic-task-confirm-modal, generic-confirm-modal-title, generic-confirm-modal-message, generic-confirm-modal-confirm-btn, generic-confirm-modal-cancel-btn, generic-confirm-modal-close-btn');
        // Fallback to old confirm if modal fails, and execute callback directly
        if (window.confirm(`${title}\n${message} (Modal Error)`)) {
            if (typeof confirmCallback === 'function') {
                // Ensure callback is awaited if it's async, though direct call here is sync
                Promise.resolve(confirmCallback()).catch(err => console.error("Error in confirmCallback:", err));
            }
        }
        return;
    }

    modalTitleElement.textContent = title;
    modalMessageElement.textContent = message;

    // Store the callback to be executed
    let currentConfirmCallback = confirmCallback;

    const closeModal = () => {
        modalOverlay.classList.remove('visible');
        modalOverlay.style.display = 'none'; // Ensure it's hidden
        // Clean up listeners to prevent multiple executions by removing stored callback
        currentConfirmCallback = null; 
        // It's safer to re-add listeners with {once: true} or remove them by named function
        // For now, relying on {once:true} and callback scoping.
    };

    const handleConfirm = async () => {
        if (typeof currentConfirmCallback === 'function') {
            try {
                await currentConfirmCallback();
            } catch (error) {
                console.error("Error executing generic confirm callback:", error);
            }
        }
        closeModal(); // closeModal will clear currentConfirmCallback
    };

    const handleCancel = () => {
        console.log('Generic confirm cancelled for title:', title);
        closeModal();
    };

    // Remove previous listeners by cloning and replacing the button, or by named functions
    // Using {once: true} is simpler if direct re-binding is okay.
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', handleConfirm, { once: true });

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', handleCancel, { once: true });
    
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', handleCancel, { once: true }); // Close also cancels

    modalOverlay.style.display = 'flex';
    modalOverlay.classList.add('visible');
}

// 将收集箱任务移至今日
function moveInboxTaskToToday(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === parseInt(taskId) && task.status === 'inbox');
    if (taskIndex !== -1) {
        tasks[taskIndex].status = 'active';
        tasks[taskIndex].dueDate = new Date().toISOString().split('T')[0]; // 设置为今天
        // tasks[taskIndex].priority = tasks[taskIndex].priority || 'none'; // 优先级保持不变或设为默认
        // tasks[taskIndex].tags = tasks[taskIndex].tags || [];       // 标签保持不变
        
        saveTasks();
        renderInboxTasks(); // 从收集箱视图移除

        // 更新"今天"视图
        const todayContainer = document.getElementById('today-container');
        if (todayContainer.style.display === 'block') {
            applyFilters(); // 如果"今天"视图是激活的，则刷新它
        } else {
            // 如果"今天"视图不是激活的，至少更新其计数
            updateTaskCount(); 
        }
        console.log(`Inbox task ${taskId} moved to Today.`);
        // showToastNotification(`任务 \"${tasks[taskIndex].text}\" 已移至今日!`);
    } else {
        console.warn(`Inbox task ${taskId} not found for moving to today.`);
    }
}

// MODIFIED: Renamed from openProcessTaskModal and generalized
function openTaskEditorModal(taskId) {
    // console.log('openTaskEditorModal called with taskId:', taskId); // DEBUG REMOVED
    // 确保快速捕获模态框是关闭的
    if (typeof hideQuickCaptureModal === 'function') {
        hideQuickCaptureModal();
    }

    // Find task by ID, should not be trashed for editing
    const taskIdInt = parseInt(taskId);
    const task = tasks.find(t => t.id === taskIdInt && t.status !== 'trashed');
    // console.log('Task found:', task); // DEBUG REMOVED
    if (!task) {
        // 修复：检查任务是否存在，如果在tasks中没找到，可能是数据不同步
        // 通过DOM查找四象限任务
        const quadrantTaskElement = document.querySelector(`.quadrant-task[data-id="${taskIdInt}"]`);
        if (quadrantTaskElement) {
            // 如果找到DOM元素，则获取任务文本
            const titleElement = quadrantTaskElement.querySelector('.quadrant-task-title');
            if (titleElement) {
                const taskText = titleElement.textContent;
                console.log(`找到四象限任务元素: ${taskText}，但在tasks数据中未找到。尝试同步...`);
                
                // 尝试识别优先级（通过四象限位置）
                let priority = 'medium'; // 默认
                const quadrant = quadrantTaskElement.closest('.quadrant');
                if (quadrant) {
                    if (quadrant.classList.contains('q1')) priority = 'high';
                    else if (quadrant.classList.contains('q2')) priority = 'medium';
                    else if (quadrant.classList.contains('q3')) priority = 'medium';
                    else if (quadrant.classList.contains('q4')) priority = 'low';
                }
                
                // 创建一个临时任务对象用于编辑
                window._tempQuadrantTask = {
                    id: taskIdInt,
                    text: taskText,
                    dueDate: '',
                    priority: priority,
                    status: 'active',
                    tags: []
                };
                
                // 使用临时任务继续编辑流程
                return openTaskEditorWithTempTask(window._tempQuadrantTask);
            }
        }
        
        console.error(`Task with ID ${taskId} not found or is trashed, cannot open editor.`);
        return;
    }

    const modal = document.getElementById('task-editor-modal');
    // console.log('Modal element:', modal); // DEBUG REMOVED
    const titleElement = document.getElementById('task-editor-title');
    const taskIdField = document.getElementById('task-editor-task-id');
    const textField = document.getElementById('task-editor-text');
    const dueDateField = document.getElementById('task-editor-due-date');
    // const priorityField = document.getElementById('task-editor-priority'); // 移除
    // const tagsField = document.getElementById('task-editor-tags'); // 移除

    if (!modal || !titleElement || !taskIdField || !textField || !dueDateField /*|| !priorityField || !tagsField*/) { // 移除检查
        console.error('One or more essential task editor modal elements not found (text, dueDate).');
        return;
    }

    titleElement.textContent = '编辑任务'; // Generalized title
    taskIdField.value = task.id;
    textField.value = task.text;
    
    // dueDate 是 YYYY-MM-DD 格式，如果 task.dueDate 是 null 或无效，则 input 会显示为空或默认
    dueDateField.value = task.dueDate ? task.dueDate.split('T')[0] : ''; 


    // console.log('Modal element values set.'); // DEBUG REMOVED

    // console.log('Attempting to show modal.'); // DEBUG REMOVED
    modal.classList.add('visible');
    modal.style.display = 'flex'; // 新增：确保 display 生效，覆盖内联的 display:none
    textField.focus(); // 聚焦到任务内容输入框
}

// 关闭处理任务模态框
function closeTaskEditorModal() { // {{modified}}
    const modal = document.getElementById('task-editor-modal');
    if (modal) {
        modal.classList.remove('visible');
        modal.style.display = 'none'; // 确保模态框完全隐藏
    }
}

// 初始化任务编辑器模态框的事件监听器
function setupTaskEditorModalListeners() {
    const saveBtn = document.getElementById('task-editor-save-btn');
    const cancelBtn = document.getElementById('task-editor-cancel-btn');
    const closeBtn = document.getElementById('task-editor-close-btn');
    const modal = document.getElementById('task-editor-modal');
    const textField = document.getElementById('task-editor-text'); // 获取文本输入框

    if (!modal || !saveBtn || !cancelBtn || !textField) { // 添加 textField 到检查中
        console.error("Task editor modal, save/cancel button, or text field not found.");
        return;
    }

    // 添加关闭按钮的事件监听器
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTaskEditorModal);
    } else {
        console.warn("Task editor close button not found.");
    }

    saveBtn.addEventListener('click', () => {
        const taskId = document.getElementById('task-editor-task-id').value;
        const text = document.getElementById('task-editor-text').value.trim();
        const dueDate = document.getElementById('task-editor-due-date').value;
        // const priority = document.getElementById('task-editor-priority').value; // 移除
        // const tagsString = document.getElementById('task-editor-tags').value.trim(); // 移除
        
        if (!text) {
            alert('任务内容不能为空！');
            document.getElementById('task-editor-text').focus();
            return;
        }

        // const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : []; // 移除

        const updates = { // {{modified}}
            text: text,
            dueDate: dueDate || null, 
            // priority: priority, // 移除
            // tags: tags // 移除
        };

        if (taskId) {
            // 检查是否是临时四象限任务
            if (window._tempQuadrantTask && window._tempQuadrantTask.id === parseInt(taskId)) {
                // 使用临时任务的数据处理保存操作
                const tempTask = window._tempQuadrantTask;
                
                // 更新临时任务对象
                tempTask.text = text;
                tempTask.dueDate = dueDate || null;
                
                // 添加到tasks数组中
                tasks.push(tempTask);
                saveTasks();
                
                // 刷新四象限视图
                if (typeof refreshQuadrantTasks === 'function') {
                    refreshQuadrantTasks();
                }
                
                // 清理临时对象
                window._tempQuadrantTask = null;
            } else {
                // 正常更新任务
                updateTaskDetails(taskId, updates);
            }
            closeTaskEditorModal();
        } else {
            console.error('Task ID not found in editor modal.');
        }
    });

    // Cancel button and Esc key logic will be added in the next step
    cancelBtn.addEventListener('click', closeTaskEditorModal); // {{modified}}

    // 新增：任务内容输入框回车保存
    textField.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止回车换行
            if (saveBtn) {
                saveBtn.click(); // 模拟点击保存按钮
            }
        }
    });

    modal.addEventListener('click', (event) => {
        // 如果点击的是模态框本身（遮罩层），则关闭
        if (event.target === modal) {
            closeTaskEditorModal(); // {{modified}}
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('visible')) {
            closeTaskEditorModal(); // {{modified}}
        }
    });
}

// 在 initTaskManager 的末尾或者合适的地方调用
// document.addEventListener('DOMContentLoaded', setupTaskEditorModalListeners); 
// 更好的方式是在 initTaskManager 中调用，确保所有元素都已加载


// --- 新的想法盒子功能 ---

// 修改：添加新想法（使用本地存储）
async function addIdea(title, description = '', tags = []) {
    if (!title || title.trim() === '') return;

    console.log('Adding idea:', { title, description, tags });

    const newIdea = {
        id: Date.now(), // 使用时间戳作为唯一ID
        title: title.trim(),
        description: description,
        tags: tags || [],
        subTasks: [],
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    // 添加加载状态
    const ideasContainer = document.getElementById('ideas-container');
    if(ideasContainer) ideasContainer.classList.add('idea-loading');

    try {
        // 将新想法添加到列表中
        ideas.push(newIdea);
        
        // 保存到本地存储
        saveIdeas();
        
        // 重新渲染想法列表
        renderIdeas();
        
        console.log('Idea added successfully:', newIdea);

    } catch (error) {
        console.error('Failed to add idea:', error);
        alert(`添加想法失败: ${error.message || '请稍后重试'}`);
    } finally {
        if(ideasContainer) ideasContainer.classList.remove('idea-loading');
    }
    
    return newIdea;
}

// 修改：删除想法（使用本地存储）
async function deleteIdea(ideaId) {
    console.log(`Deleting idea ${ideaId}`);
    
    const ideaIdNum = parseInt(ideaId);
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdNum);
    
    if (ideaIndex !== -1) {
        // 删除想法
        ideas.splice(ideaIndex, 1);
        
        // 保存到本地存储
        saveIdeas();
        
        // 重新渲染
        renderIdeas();
        
        console.log(`Idea ${ideaId} deleted successfully`);
    } else {
        console.warn(`Idea ${ideaId} not found, cannot delete`);
    }
}

// 修改：为想法添加子任务（使用本地存储）
async function addSubTaskToIdea(ideaId, subTaskTitle) {
    if (!subTaskTitle || subTaskTitle.trim() === '') return;

    console.log(`Adding subtask "${subTaskTitle}" to idea ${ideaId}`);
    
    const ideaIdNum = parseInt(ideaId);
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdNum);
    
    if (ideaIndex !== -1) {
        // 创建子任务对象
        const newSubTask = {
            id: Date.now(), // 使用时间戳作为唯一ID
            text: subTaskTitle.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        // 添加到想法的子任务列表
        if (!ideas[ideaIndex].subTasks) {
            ideas[ideaIndex].subTasks = [];
        }
        ideas[ideaIndex].subTasks.push(newSubTask);
        
        // 保存到本地存储
        saveIdeas();
        
        // 重新渲染
        renderIdeas();
        
        console.log(`Subtask added to idea ${ideaId} successfully:`, newSubTask);
    } else {
        console.warn(`Idea ${ideaId} not found, cannot add subtask`);
    }
}

// 修改：从想法中删除子任务（使用本地存储）
async function deleteSubTaskFromIdea(ideaId, subTaskId) {
    console.log(`Deleting subtask ${subTaskId} from idea ${ideaId}`);
    
    const ideaIdNum = parseInt(ideaId);
    const subTaskIdNum = parseInt(subTaskId);
    
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdNum);
    
    if (ideaIndex !== -1 && ideas[ideaIndex].subTasks) {
        const subTaskIndex = ideas[ideaIndex].subTasks.findIndex(st => st.id === subTaskIdNum);
        
        if (subTaskIndex !== -1) {
            // 删除子任务
            ideas[ideaIndex].subTasks.splice(subTaskIndex, 1);
            
            // 保存到本地存储
            saveIdeas();
            
            // 重新渲染
            renderIdeas();
            
            console.log(`Subtask ${subTaskId} deleted from idea ${ideaId} successfully`);
        } else {
            console.warn(`Subtask ${subTaskId} not found in idea ${ideaId}, cannot delete`);
        }
    } else {
        console.warn(`Idea ${ideaId} not found or has no subtasks, cannot delete subtask`);
    }
}

// 修改：切换想法子任务完成状态（使用本地存储）
async function toggleSubTaskCompleted(ideaId, subTaskId, isCompleted) {
    console.log(`Toggling subtask ${subTaskId} completion status to ${isCompleted} in idea ${ideaId}`);
    
    const ideaIdNum = parseInt(ideaId);
    const subTaskIdNum = parseInt(subTaskId);
    
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdNum);
    
    if (ideaIndex !== -1 && ideas[ideaIndex].subTasks) {
        const subTaskIndex = ideas[ideaIndex].subTasks.findIndex(st => st.id === subTaskIdNum);
        
        if (subTaskIndex !== -1) {
            // 更新完成状态
            ideas[ideaIndex].subTasks[subTaskIndex].completed = isCompleted;
            
            // 保存到本地存储
            saveIdeas();
            
            // 重新渲染
            renderIdeas();
            
            console.log(`Subtask ${subTaskId} completion status updated in idea ${ideaId}`);
        } else {
            console.warn(`Subtask ${subTaskId} not found in idea ${ideaId}, cannot update status`);
        }
    } else {
        console.warn(`Idea ${ideaId} not found or has no subtasks, cannot update subtask status`);
    }
}

// 为想法项添加右键菜单
function showIdeaContextMenu(event, ideaId) {
    // 阻止默认右键菜单
    event.preventDefault();
    
    // 关闭任何已存在的菜单
    closeContextMenu();

    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) {
        console.warn(`想法ID ${ideaId} 未找到，无法显示上下文菜单。`);
        return;
    }
    
    const idea = ideas[ideaIndex];
    
    // 创建菜单元素
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.id = 'idea-context-menu';
    
    // 添加菜单选项
    const menuOptions = [
        { label: '编辑想法', icon: 'fas fa-edit', action: () => editIdea(idea.id) },
        { label: '删除想法', icon: 'fas fa-trash-alt', action: () => {
            showGenericConfirmModal(
                '确认删除想法',
                `确定要删除想法 "${idea.title}" 及其所有子任务吗？此操作无法恢复。`,
                () => deleteIdea(idea.id)
            );
        }},
        { label: '子任务转为任务', icon: 'fas fa-exchange-alt', action: () => convertIdeaToTask(idea.id) },
        { label: '全部完成', icon: 'fas fa-check-double', action: () => markAllSubtasksCompleted(idea.id) }
    ];
    
    menuOptions.forEach(option => {
        const menuItem = document.createElement('div');
        menuItem.className = `context-menu-option ${option.className || ''}`;
        menuItem.innerHTML = `
            <i class="${option.icon}"></i>
            <span>${option.label}</span>
        `;
        menuItem.addEventListener('click', () => {
            option.action();
            closeContextMenu();
        });
        menu.appendChild(menuItem);
    });
    
    // 添加到文档并定位
    document.body.appendChild(menu);
    positionContextMenu(menu, event);
    
    // 添加点击外部关闭菜单的事件监听器
    document.addEventListener('click', closeContextMenuOnClickOutside, true);
}

// 为子任务添加右键菜单
function showSubtaskContextMenu(event, ideaId, subtaskId) {
    // 阻止默认右键菜单
    event.preventDefault();
    
    // 关闭任何已存在的菜单
    closeContextMenu();
    
    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) {
        console.warn(`想法ID ${ideaId} 未找到，无法显示子任务上下文菜单。`);
        return;
    }
    
    const idea = ideas[ideaIndex];
    const subtaskIndex = idea.subTasks.findIndex(st => st.id === parseInt(subtaskId));
    if (subtaskIndex === -1) {
        console.warn(`子任务ID ${subtaskId} 未找到，无法显示上下文菜单。`);
        return;
    }
    
    const subtask = idea.subTasks[subtaskIndex];
    
    // 创建菜单元素
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu subtask-context-menu';
    menu.id = 'subtask-context-menu';
    
    // 添加菜单选项
    const menuOptions = [
        { 
            label: subtask.completed ? '标记为未完成' : '标记为已完成', 
            icon: subtask.completed ? 'fas fa-square' : 'fas fa-check-square', 
            action: () => toggleSubTaskCompleted(idea.id, subtask.id, !subtask.completed) 
        },
        { label: '设置优先级', icon: 'fas fa-flag', className: 'context-menu-option-priority', action: () => {
            // 子菜单的坐标
            const rect = menu.getBoundingClientRect();
            const x = rect.right;
            const y = rect.top;
            
            // 创建一个虚拟事件对象，用于定位子菜单
            const mockEvent = { clientX: x, clientY: y, preventDefault: () => {} };
            
            // 显示优先级子菜单
            showSubtaskPrioritySubMenu(mockEvent, idea.id, subtask.id);
        }},
        { label: '转为任务', icon: 'fas fa-exchange-alt', action: () => {
            console.log(`点击了子任务转换按钮 - ideaId: ${idea.id}, subtaskId: ${subtask.id}`);
            convertSubtaskToTask(idea.id, subtask.id);
        }},
        { label: '删除子任务', icon: 'fas fa-trash-alt', className: 'delete', action: () => {
            showDeleteSubTaskConfirmModal(idea.id, subtask.id, subtask.text);
        }}
    ];
    
    menuOptions.forEach(option => {
        const menuItem = document.createElement('div');
        menuItem.className = `context-menu-option ${option.className || ''}`;
        menuItem.innerHTML = `
            <i class="${option.icon}"></i>
            <span>${option.label}</span>
        `;
        menuItem.addEventListener('click', () => {
            option.action();
            // 仅当不是打开子菜单的选项时才关闭菜单
            if (option.className !== 'context-menu-option-priority') {
                closeContextMenu();
            }
        });
        menu.appendChild(menuItem);
    });
    
    // 添加到文档并定位
    document.body.appendChild(menu);
    positionContextMenu(menu, event);
    
    // 添加点击外部关闭菜单的事件监听器
    document.addEventListener('click', closeContextMenuOnClickOutside, true);
}

// 为子任务创建优先级子菜单
function showSubtaskPrioritySubMenu(event, ideaId, subtaskId) {
    event.preventDefault();
    
    // 关闭之前的上下文菜单，但保留父菜单
    const previousSubMenu = document.querySelector('.custom-context-submenu');
    if (previousSubMenu) {
        previousSubMenu.remove();
    }
    
    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) return;
    
    const idea = ideas[ideaIndex];
    const subtaskIndex = idea.subTasks.findIndex(st => st.id === parseInt(subtaskId));
    if (subtaskIndex === -1) return;
    
    const subtask = idea.subTasks[subtaskIndex];
    
    // 创建优先级子菜单
    const subMenu = document.createElement('div');
    subMenu.className = 'custom-context-menu custom-context-submenu';
    
    // 优先级选项
    const priorities = [
        { value: 'high', label: '高优先级', iconClass: 'fas fa-flag priority-high-icon' },
        { value: 'medium', label: '中优先级', iconClass: 'fas fa-flag priority-medium-icon' },
        { value: 'low', label: '低优先级', iconClass: 'fas fa-flag priority-low-icon' },
        { value: '', label: '无优先级', iconClass: 'fas fa-times' }
    ];
    
    priorities.forEach(priority => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-option';
        if (subtask.priority === priority.value) {
            menuItem.classList.add('selected');
        }
        
        menuItem.innerHTML = `
            <i class="${priority.iconClass}"></i>
            <span>${priority.label}</span>
        `;
        
        menuItem.addEventListener('click', async () => {
            // 更新子任务优先级
            await updateSubtaskPriority(ideaId, subtaskId, priority.value);
            closeContextMenu();
        });
        
        subMenu.appendChild(menuItem);
    });
    
    // 添加到文档并定位
    document.body.appendChild(subMenu);
    
    // 在父菜单右侧显示子菜单
    const parentMenu = document.getElementById('subtask-context-menu');
    if (parentMenu) {
        const parentRect = parentMenu.getBoundingClientRect();
        const mockEventForPositioning = { 
            clientX: parentRect.right, 
            clientY: parentRect.top 
        };
        positionContextMenu(subMenu, mockEventForPositioning);
    } else {
        positionContextMenu(subMenu, event);
    }
    
    // 添加全局点击监听器以关闭
    document.addEventListener('click', closeContextMenuOnClickOutside, true);
}

// 更新子任务优先级
async function updateSubtaskPriority(ideaId, subtaskId, priority) {
    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) return;
    
    const idea = ideas[ideaIndex];
    const subtaskIndex = idea.subTasks.findIndex(st => st.id === parseInt(subtaskId));
    if (subtaskIndex === -1) return;
    
    // 更新优先级
    idea.subTasks[subtaskIndex].priority = priority;
    
    // 保存并渲染
    saveIdeas();
    renderIdeas();
}

// 编辑想法
function editIdea(ideaId) {
    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) return;
    
    const idea = ideas[ideaIndex];
    
    // 获取想法输入框
    const ideaInput = document.getElementById('new-idea-input');
    if (!ideaInput) return;
    
    // 设置输入框值为想法标题
    ideaInput.value = idea.title;
    ideaInput.focus();
    
    // 修改添加按钮文本为"更新想法"
    const addButton = document.getElementById('add-idea-btn');
    if (addButton) {
        const originalText = addButton.textContent;
        addButton.textContent = '更新想法';
        
        // 创建一个一次性的事件处理函数，用于更新想法
        const updateHandler = async () => {
            const newTitle = ideaInput.value.trim();
            if (newTitle) {
                // 更新想法标题
                idea.title = newTitle;
                // 更新修改时间
                idea.updatedAt = new Date().toISOString();
                
                // 保存并渲染
                saveIdeas();
                renderIdeas();
                
                // 重置输入框和按钮
                ideaInput.value = '';
                addButton.textContent = originalText;
                
                // 移除事件监听器
                addButton.removeEventListener('click', updateHandler);
            }
        };
        
        // 添加事件监听器
        addButton.addEventListener('click', updateHandler, { once: true });
        
        // 添加按下回车键的事件监听器
        ideaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                updateHandler();
            }
        }, { once: true });
    }
}

// 将想法转换为任务
/**
 * 将想法的所有子任务转换为独立任务
 * @param {number} ideaId 想法ID
 */
async function convertIdeaToTask(ideaId) {
    console.log(`[DEBUG] convertIdeaToTask called with ideaId: ${ideaId}`);
    const ideaIdInt = parseInt(ideaId, 10);
    
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdInt);
    if (ideaIndex === -1) {
        console.error(`找不到想法ID: ${ideaIdInt}`);
        showToast('找不到对应的想法', 'error');
        return;
    }
    
    const idea = ideas[ideaIndex];
    console.log(`[DEBUG] 找到想法: ${idea.title}, 子任务数量: ${idea.subTasks?.length || 0}`);
    
    // 检查想法是否有子任务
    if (!idea.subTasks || idea.subTasks.length === 0) {
        showToast(`想法"${idea.title}"没有子任务可以转换`, 'warning');
        return;
    }
    
    // 筛选出活动状态的子任务
    const activeSubTasks = idea.subTasks.filter(st => st.status === 'active');
    if (activeSubTasks.length === 0) {
        showToast(`想法"${idea.title}"没有活动状态的子任务可以转换`, 'warning');
        return;
    }
    
    console.log(`[DEBUG] 准备转换 ${activeSubTasks.length} 个子任务`);
    
    try {
        // 为每个子任务创建一个新任务
        const conversionPromises = activeSubTasks.map(subtask => 
            addTask(subtask.text, null, subtask.priority, subtask.tags || [], 'active')
        );
        
        const createdTasks = await Promise.all(conversionPromises);
        console.log(`[DEBUG] 已成功创建 ${createdTasks.length} 个新任务`);
        
        // 从想法中移除已转换的子任务
        idea.subTasks = idea.subTasks.filter(st => !activeSubTasks.some(ast => ast.id === st.id));
        saveIdeas();
        
        // 刷新视图
        renderIdeas();
        renderTasks();
        
        // 显示成功消息
        showToast(`已将想法"${idea.title}"的${createdTasks.length}个子任务转换为独立任务`, 'success');
    } catch (error) {
        console.error('转换想法子任务为任务失败:', error);
        showToast('转换失败，请重试', 'error');
    }
}

/**
 * 将子任务转换为独立任务
 * @param {number} ideaId 想法ID
 * @param {number} subtaskId 子任务ID
 */
async function convertSubtaskToTask(ideaId, subtaskId) {
    console.log(`[DEBUG] convertSubtaskToTask called with ideaId: ${ideaId}, subtaskId: ${subtaskId}`);
    
    // 转换为整数确保可以正确比较
    const ideaIdInt = parseInt(ideaId, 10);
    const subtaskIdInt = parseInt(subtaskId, 10);
    
    // 日志输出转换后的ID，便于调试
    console.log(`[DEBUG] Parsed IDs - ideaId: ${ideaIdInt}, subtaskId: ${subtaskIdInt}`);
    
    const ideaIndex = ideas.findIndex(idea => idea.id === ideaIdInt);
    if (ideaIndex === -1) {
        console.error(`找不到想法ID: ${ideaIdInt}`);
        return;
    }
    
    const idea = ideas[ideaIndex];
    console.log(`[DEBUG] 找到想法: ${idea.title}, 子任务数量: ${idea.subTasks?.length || 0}`);
    
    // 显示所有子任务的ID，方便调试
    if (idea.subTasks && idea.subTasks.length > 0) {
        console.log(`[DEBUG] 所有子任务ID:`, idea.subTasks.map(st => st.id));
    }
    
    const subtaskIndex = idea.subTasks.findIndex(st => st.id === subtaskIdInt);
    if (subtaskIndex === -1) {
        console.error(`找不到子任务ID: ${subtaskIdInt}`);
        return;
    }
    
    const subtask = idea.subTasks[subtaskIndex];
    console.log(`[DEBUG] 找到子任务: ${subtask.text}, 优先级: ${subtask.priority || '无'}`);
    
    try {
        // 创建新任务，保留子任务的属性（文本、优先级、标签等）
        const newTask = await addTask(subtask.text, null, subtask.priority, subtask.tags || [], 'active');
        console.log(`[DEBUG] 已创建新任务: ${JSON.stringify(newTask)}`);
        
        // 删除原子任务（可选）
        // 如果需要删除子任务，请取消注释下面的代码
        idea.subTasks.splice(subtaskIndex, 1);
        saveIdeas();
        renderIdeas();
        
        // 显示成功消息
        showToast(`已将子任务"${subtask.text}"转换为任务`, 'success');
        
        // 确保刷新任务视图
        renderTasks();
        
    } catch (error) {
        console.error('转换子任务为任务失败:', error);
        showToast('转换失败，请重试', 'error');
    }
}

// 标记想法的所有子任务为已完成
function markAllSubtasksCompleted(ideaId) {
    const ideaIndex = ideas.findIndex(idea => idea.id === parseInt(ideaId));
    if (ideaIndex === -1) return;
    
    const idea = ideas[ideaIndex];
    
    // 标记所有子任务为已完成
    idea.subTasks.forEach(subtask => {
        subtask.completed = true;
    });
    
    // 保存并渲染
    saveIdeas();
    renderIdeas();
    
    showToast(`已将所有子任务标记为已完成`, 'success');
}

// 渲染所有想法到UI (将在后续步骤中完整实现)
function renderIdeas() {
    const ideasListContainer = document.getElementById('ideas-list-container');
    if (!ideasListContainer) {
        // console.error("Ideas list container ('#ideas-list-container') not found.");
        // 在initTaskManager中元素可能还未准备好，这个log可以暂时注释
        return;
    }
    ideasListContainer.innerHTML = ''; // 清空

    if (ideas.length === 0) {
        ideasListContainer.innerHTML = '<li class="empty-list-message">开始记录你的第一个想法吧！使用上方的输入框添加新想法。</li>';
        return;
    }

    // 可选：按创建时间倒序显示想法
    const sortedIdeas = ideas.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sortedIdeas.forEach(idea => {
        const ideaElement = document.createElement('div');
        ideaElement.className = 'idea-item';
        ideaElement.setAttribute('data-idea-id', idea.id);

        // --- HTML for Rich Sub-task Input Area (mimicking main task input) ---
        const subTaskInputAreaHTML = `
            <div class="idea-subtask-input-box task-input-box">
                <div class="icons-container">
                    <div class="icon add-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                </div>
                
                <input type="text" class="idea-subtask-input task-input" placeholder="添加具体任务...">
                <div class="task-options">
                    
                    
                    
                    <button class="add-idea-subtask-btn icon-btn" title="添加任务"><i class="fas fa-arrow-up"></i></button> 
                </div>
            </div>
        `;

        let subTasksHtml = '<ul class="idea-subtask-list">';
        // Filter active sub-tasks for rendering
        const activeSubTasks = idea.subTasks.filter(st => st.status === 'active');

        if (activeSubTasks.length === 0) {
            subTasksHtml += '<li class="empty-subtask-message">为此想法添加具体任务步骤...</li>';
        } else {
            activeSubTasks.forEach(subTask => {
                // console.log(`渲染子任务: "${subTask.text}", 优先级: \'${subTask.priority}\'`); // DIAGNOSTIC LOG {{removed}}
                let subTaskTagsHtml = '';
                if (subTask.tags && subTask.tags.length > 0) {
                    subTaskTagsHtml = subTask.tags.map(tag => `<span class="idea-subtask-tag">#${tag}</span>`).join('');
                }

                subTasksHtml += `
                    <li class="idea-subtask-item ${subTask.completed ? 'completed' : ''}" data-subtask-id="${subTask.id}">
                        <div class="idea-subtask-checkbox ${subTask.completed ? 'checked' : ''}"></div>
                        <div class="idea-subtask-details">
                            <span class="idea-subtask-text">${subTask.text}</span>
                            <div class="idea-subtask-meta">
                                ${subTaskTagsHtml}
                                ${subTask.priority ? `<span class="subtask-priority-display priority-${subTask.priority}"><i class="fas fa-flag"></i></span>` : ''}
                            </div>
                        </div>
                        <button class="delete-subtask-btn icon-btn"><i class="fas fa-times"></i></button>
                    </li>
                `;
            });
        }
        subTasksHtml += '</ul>';

        ideaElement.innerHTML = `
            <div class="idea-header">
                <h3 class="idea-title">${idea.title}</h3>
                <button class="delete-idea-btn icon-btn"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="idea-content">
                ${subTasksHtml}
                <div class="idea-subtask-input-container">
                    ${subTaskInputAreaHTML} 
                </div>
            </div>
        `;
        ideasListContainer.appendChild(ideaElement);

        // 事件监听器
        const deleteIdeaBtn = ideaElement.querySelector('.delete-idea-btn');
        if (deleteIdeaBtn) {
            deleteIdeaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ideaToDelete = ideas.find(i => i.id === parseInt(idea.id));
                if (ideaToDelete) {
                    showGenericConfirmModal(
                        '确认删除想法',
                        `确定要删除想法 "${ideaToDelete.title}" 及其所有子任务吗？此操作无法恢复。`,
                        async () => {
                            await deleteIdea(idea.id);
                        }
                    );
                } else {
                    console.warn(`Idea with ID ${idea.id} not found for deletion confirmation.`);
                    // Fallback to old confirm or show an error
                    if (window.confirm(`[Fallback] 无法找到想法 ${idea.id} 的详情。仍要尝试删除吗？`)) {
                        deleteIdea(idea.id);
                    }
                }
            });
        }
        
        // 添加右键菜单事件监听器
        ideaElement.addEventListener('contextmenu', (event) => {
            showIdeaContextMenu(event, idea.id);
        });

        const addSubTaskButton = ideaElement.querySelector('.add-idea-subtask-btn');
        const subTaskInput = ideaElement.querySelector('.idea-subtask-input');

        if (addSubTaskButton && subTaskInput) {
            const currentIdeaId = idea.id; // Capture idea.id for the closure

            // 定义 addSubTaskAction 函数
            const addSubTaskAction = async () => { 
                const subTaskTitle = subTaskInput.value.trim();
                if (subTaskTitle) {
                    await addSubTaskToIdea(currentIdeaId, subTaskTitle);
                    subTaskInput.value = ''; // 清空输入框
                }
            };

            addSubTaskButton.onclick = addSubTaskAction; // 按钮点击
            subTaskInput.addEventListener('keypress', (e) => { // 输入框回车
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubTaskAction();
                }
            });
        }

        // 为子任务列表中的每一项添加事件监听
        ideaElement.querySelectorAll('.idea-subtask-item').forEach(item => {
            const currentSubTaskId = item.getAttribute('data-subtask-id');
            const checkbox = item.querySelector('.idea-subtask-checkbox');
            const deleteBtn = item.querySelector('.delete-subtask-btn');

            if (checkbox) {
                // 确保在设置 checkbox.checked 之前，idea.subTasks 和对应的子任务存在
                const subTaskForCheckbox = idea.subTasks && idea.subTasks.find(st => st.id.toString() === currentSubTaskId);
                if (subTaskForCheckbox && subTaskForCheckbox.completed) {
                    checkbox.classList.add('checked');
                } else {
                    checkbox.classList.remove('checked');
                }
                
                checkbox.addEventListener('click', async () => {
                    // 再次确认 idea.id 和 currentSubTaskId 的有效性
                    if (idea && idea.id && currentSubTaskId) {
                        checkbox.classList.toggle('checked');
                        const isNowCompleted = checkbox.classList.contains('checked');
                        await toggleSubTaskCompleted(idea.id, currentSubTaskId, isNowCompleted);
                    } else {
                        console.error("Error in subtask checkbox: idea.id or subTaskId is invalid.");
                    }
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    const currentIdeaId = idea.id;
                    const targetSubTask = idea.subTasks && idea.subTasks.find(st => st.id.toString() === currentSubTaskId);

                    let subTaskTextToShow = '这个子任务'; // 默认文本
                    if (targetSubTask && targetSubTask.text) {
                        subTaskTextToShow = `"${targetSubTask.text}"`;
                    } else {
                        console.warn(`Subtask with ID ${currentSubTaskId} not found or has no text in idea ${currentIdeaId}. Using default text for confirmation.`);
                    }
                    // 即使 targetSubTask 未找到，我们仍然尝试使用 currentIdeaId 和 currentSubTaskId 调用模态框
                    // 因为删除操作可能仅依赖于ID，而文本仅用于显示。
                    showDeleteSubTaskConfirmModal(currentIdeaId, currentSubTaskId, subTaskTextToShow);
                });
            }
            
            // 添加子任务右键菜单事件监听器
            item.addEventListener('contextmenu', (event) => {
                showSubtaskContextMenu(event, idea.id, currentSubTaskId);
            });
        });
    });
} 

// 新增：创建优先级设置子菜单
function createPrioritySubMenu(taskId, x, y) {
    // console.log(`[DEBUG] createPrioritySubMenu called for taskID: ${taskId}, x: ${x}, y: ${y}`); // 调试日志1 -- REMOVED
    closeContextMenu(); // 关闭任何已存在的上下文菜单

    const task = tasks.find(t => t.id === parseInt(taskId));
    if (!task) {
        console.warn(`Task ${taskId} not found for priority submenu.`);
        return;
    }

    const subMenu = document.createElement('div');
    subMenu.className = 'custom-context-menu custom-context-submenu'; // 特定子菜单类

    const priorityOptions = [
        { label: '无优先级', value: '', icon: 'fas fa-ban' },
        { label: '低', value: 'low', icon: 'fas fa-flag priority-low-icon' }, // 使用特定类以便CSS着色
        { label: '中', value: 'medium', icon: 'fas fa-flag priority-medium-icon' },
        { label: '高', value: 'high', icon: 'fas fa-flag priority-high-icon' }
    ];

    priorityOptions.forEach(opt => {
        const optionElement = document.createElement('div');
        optionElement.className = 'context-menu-option';
        if (task.priority === opt.value) {
            optionElement.classList.add('selected'); // 标记当前选中的优先级
        }
        optionElement.innerHTML = `<i class="${opt.icon}"></i> ${opt.label}`;
        
        optionElement.onclick = (event) => {
            event.stopPropagation();
            task.priority = opt.value;
            saveTasks();
            renderTasks(); // 或更精细的更新逻辑，例如只更新该任务项
            closeContextMenu(); // 关闭所有自定义菜单
        };
        subMenu.appendChild(optionElement);
    });

    document.body.appendChild(subMenu);
    // console.log(`[DEBUG] subMenu appended. offsetHeight: ${subMenu.offsetHeight}, offsetWidth: ${subMenu.offsetWidth}`); // 调试日志2 -- REMOVED
    // console.log(`[DEBUG] subMenu innerHTML:`, subMenu.innerHTML); // 调试日志3 -- REMOVED

    // 使用通用的菜单定位函数
    // 创建一个模拟event对象，因为这个函数被调用时传入的是坐标而不是event
    const mockEvent = { clientX: x, clientY: y };
    positionContextMenu(subMenu, mockEvent);
    subMenu.style.zIndex = '1260'; // 确保在其他菜单之上
    
    // 添加全局点击监听器以关闭
    setTimeout(() => {
        document.addEventListener('click', closeContextMenuOnClickOutside, true);
    }, 0);
}



// 修改：删除任务 (调用 API) - 对应旧的 deleteTask
async function deleteTask(taskId) { // 改为 async
    console.log(`[DEBUG] deleteTask CALLED with taskId: ${taskId} (soft delete a.k.a trash)`);
    // 注意：此函数现在执行"软删除"（移至垃圾桶）
    // 为了与现有的 trashTask 行为保持一致。
    // 永久删除由 permanentlyDeleteTask 处理。
    if (!taskId) {
        console.error("deleteTask: Task ID is undefined or null.");
        showToast("无法删除任务：任务ID无效", "error");
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex > -1) {
        tasks[taskIndex].status = 'trashed';
        tasks[taskIndex].deletedAt = new Date().toISOString(); // 记录删除时间
        saveTasks();
        await loadTasks(); // 重新加载并渲染所有视图
        showToast("任务已移至垃圾桶");
        console.log(`Task ${taskId} moved to trash.`);
        updateTaskCount(); // 更新侧边栏计数
        updateCompletionStats();
        updateCompletedMenuCount();
    } else {
        console.error(`Task not found for soft deletion: ${taskId}`);
        showToast("未找到要删除的任务", "error");
    }
}

async function permanentlyDeleteTask(taskId) { // 改为 async
    console.log(`[DEBUG] permanentlyDeleteTask CALLED with taskId: ${taskId}`);
    if (!taskId) {
        console.error("permanentlyDeleteTask: Task ID is undefined or null.");
        showToast("无法永久删除任务：任务ID无效", "error");
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex > -1) {
        tasks.splice(taskIndex, 1); // 从数组中永久删除
        saveTasks(); // 保存更改到 localStorage
        // 无需从未完成列表中移除，因为它已经被硬删除了
        // 无需从未完成列表中移除，因为它已经被硬删除了
        // 无需从未完成列表中移除，因为它已经被硬删除了
        // 无需从未完成列表中移除，因为它已经被硬删除了
        await loadTasks(); // 重新加载任务以更新所有视图
        showToast("任务已永久删除");
        console.log(`Task ${taskId} permanently deleted.`);
        updateTaskCount();
        updateCompletionStats();
        updateCompletedMenuCount();

    } else {
        console.error(`Task not found for permanent deletion: ${taskId}`);
        showToast("未找到要永久删除的任务", "error");
    }
}

async function trashTask(taskId) { // 改为 async，行为与 deleteTask (软删除) 一致
    console.log(`[DEBUG] trashTask CALLED with taskId: ${taskId}`);
    // 此函数现在与 deleteTask 的行为相同，将任务移至垃圾桶 (软删除)
    if (!taskId) {
        console.error("trashTask: Task ID is undefined or null.");
        showToast("无法移动任务至垃圾桶：任务ID无效", "error");
        return;
    }
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex > -1) {
        tasks[taskIndex].status = 'trashed';
        tasks[taskIndex].deletedAt = new Date().toISOString();
        saveTasks();
        await loadTasks(); // 重新加载并渲染所有视图
        showToast("任务已移至垃圾桶");
        console.log(`Task ${taskId} moved to trash via trashTask.`);
        updateTaskCount();
        updateCompletionStats();
        updateCompletedMenuCount();
    } else {
        console.error(`Task not found for trashing: ${taskId}`);
        showToast("未找到要移至垃圾桶的任务", "error");
    }
}

async function restoreTask(taskId) { // 改为 async
    console.log(`[DEBUG] restoreTask CALLED with taskId: ${taskId}`);
    if (!taskId) {
        console.error("restoreTask: Task ID is undefined or null.");
        showToast("无法恢复任务：任务ID无效", "error");
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id == taskId);
    if (taskIndex > -1) {
        // 检查原始状态或默认为 'active'
        // 如果我们之前保存了 originalStatus，可以在这里使用
        // tasks[taskIndex].status = tasks[taskIndex].originalStatus || 'active';
        // 简单起见，我们直接恢复为 'active'
        tasks[taskIndex].status = 'active';
        delete tasks[taskIndex].deletedAt; // 移除删除时间戳
        saveTasks();
        await loadTasks(); // 重新加载并渲染所有视图
        showToast("任务已恢复");
        console.log(`Task ${taskId} restored.`);
        updateTaskCount();
        updateCompletionStats();
        updateCompletedMenuCount();
    } else {
        console.error(`Task not found for restoration: ${taskId}`);
        showToast("未找到要恢复的任务", "error");
    }
}

// 修改：更新任务详情 (使用本地存储)
function updateTaskDetails(taskId, updates) {
    
    const taskIdNum = parseInt(taskId);
    const taskIndex = tasks.findIndex(task => task.id === taskIdNum);
    
    if (taskIndex !== -1) {
        // 更新任务对象的属性
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        
        // 保存到本地存储
        saveTasks();
        
        // 重新渲染常规任务列表
        renderTasks();
        
        // 刷新四象限视图
        if (typeof refreshQuadrantTasks === 'function') {
            refreshQuadrantTasks();
        }
                } else {
        console.warn(`任务 ${taskId} 未找到，无法更新`);
    }
}

// **重要**: 确保 initTaskManager() 在 DOMContentLoaded 后被调用
document.addEventListener('DOMContentLoaded', initTaskManager);

// 新增：显示删除子任务确认模态框
function showDeleteSubTaskConfirmModal(ideaId, subTaskId, subTaskText) {
    const modalOverlay = document.getElementById('delete-subtask-confirm-modal');
    const modalMessage = document.getElementById('confirm-modal-message-subtask');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn-subtask');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn-subtask');
    const closeBtn = document.getElementById('confirm-modal-close-btn-subtask');

    if (!modalOverlay) {
        console.error('CRITICAL: Delete sub-task modal overlay (delete-subtask-confirm-modal) not found!');
        if (confirm(`[Fallback] 确定要删除 ${subTaskText} 吗？`)) {
            deleteSubTaskFromIdea(ideaId, subTaskId);
        }
        return;
    }
    if (!confirmBtn) {
         console.error('CRITICAL: Delete sub-task modal: #confirm-modal-confirm-btn-subtask not found. Cannot proceed.');
        if (confirm(`[Fallback - Critical Button Missing] 确定要删除 ${subTaskText} 吗？`)) {
            deleteSubTaskFromIdea(ideaId, subTaskId);
        }
        return;
    }
    if (!modalMessage) console.warn('Delete sub-task modal: #confirm-modal-message-subtask not found.');
    if (!cancelBtn) console.warn('Delete sub-task modal: #confirm-modal-cancel-btn-subtask not found.');
    if (!closeBtn) console.warn('Delete sub-task modal: #confirm-modal-close-btn-subtask not found.');


    if (modalMessage) {
        modalMessage.textContent = `确定要删除子任务 ${subTaskText} 吗？此操作无法撤销。`;
    } else {
        console.warn("Delete sub-task modal message element not found, proceeding without custom message.");
    }

    const closeModal = () => {
        modalOverlay.style.display = 'none'; // 确保隐藏
        modalOverlay.classList.remove('visible');
    };

    const handleConfirm = async () => {
        await deleteSubTaskFromIdea(ideaId, subTaskId);
        closeModal();
    };
    
    const handleCancel = () => {
        console.log('Delete sub-task cancelled.');
        closeModal();
    };

    // 确保移除旧监听器 (通过复制并替换按钮来确保没有残留)
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', handleConfirm, { once: true });

    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', handleCancel, { once: true });
    }
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', handleCancel, { once: true }); // Close button usually acts as cancel
    }

    modalOverlay.style.display = 'flex'; // 确保模态框可见
    modalOverlay.classList.add('visible');
}

// 新函数：显示用于新任务的优先级选择浮动菜单
function showNewTaskPriorityMenu(triggerElement) {
    closeContextMenu(); // 关闭任何已存在的上下文菜单

    const subMenu = document.createElement('div');
    subMenu.className = 'custom-context-menu custom-new-task-priority-menu'; // 使用特定类以区分

    const priorityOptionsConfig = [
        { label: '无优先级', value: '', icon: 'fas fa-ban' },
        { label: '低', value: 'low', icon: 'fas fa-flag priority-low-icon' },
        { label: '中', value: 'medium', icon: 'fas fa-flag priority-medium-icon' },
        { label: '高', value: 'high', icon: 'fas fa-flag priority-high-icon' }
    ];

    priorityOptionsConfig.forEach(opt => {
        const optionElement = document.createElement('div');
        optionElement.className = 'context-menu-option';
        if (selectedPriority === opt.value) { // 比较全局 selectedPriority
            optionElement.classList.add('selected');
        }
        optionElement.innerHTML = `<i class="${opt.icon}"></i> ${opt.label}`;
        
        optionElement.onclick = (event) => {
            event.stopPropagation();
            selectedPriority = opt.value; // 更新全局 selectedPriority
            updateMainInputPriorityDisplay(); // 更新主输入框的显示
            closeContextMenu(); // 关闭此菜单
        };
        subMenu.appendChild(optionElement);
    });

    document.body.appendChild(subMenu);
    
    // 定位菜单
    const rect = triggerElement.getBoundingClientRect();
    const mockEventForPositioning = { clientX: rect.left, clientY: rect.bottom + 5 }; // 模拟事件，定位在按钮下方
    positionContextMenu(subMenu, mockEventForPositioning); // 使用通用定位函数
    subMenu.style.zIndex = '1260'; 

    // 添加全局点击监听器以关闭（positionContextMenu 可能已添加，但为确保而再次调用）
    setTimeout(() => {
        document.addEventListener('click', closeContextMenuOnClickOutside, true);
    }, 0);
}

// 新函数：显示用于新任务的标签编辑器浮动面板
function showNewTaskTagEditor(triggerElement) {
    closeContextMenu(); // 关闭任何其他打开的菜单或编辑器
    closeFloatingTagEditor(); // 确保旧的标签编辑器已关闭（如果有）

    const editor = document.createElement('div');
    editor.id = 'floating-tag-editor-active'; // 使用与任务项编辑器相同的ID，确保一次只有一个
    editor.className = 'floating-tag-editor new-task-tag-editor'; // 添加特定类以供样式或区分
    editor.style.position = 'absolute';

    editor.innerHTML = `
        <div class="floating-tag-editor-header">
            <span>设置标签</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="floating-tag-editor-content">
            <div class="selected-tags-display">
                <!-- 当前选中的全局标签将在这里显示 -->
            </div>
            <input type="text" class="tag-search-input" placeholder="输入或选择标签...">
            <div class="tag-suggestions-list">
                <!-- 标签建议 -->
            </div>
        </div>
        <div class="floating-tag-editor-footer">
            <button class="cancel-btn">取消</button> 
            <button class="save-btn primary-button">完成</button> 
        </div>
    `;

    document.body.appendChild(editor);

    const header = editor.querySelector('.floating-tag-editor-header');
    const closeButton = editor.querySelector('.floating-tag-editor-header .close-btn');
    const selectedTagsContainer = editor.querySelector('.selected-tags-display');
    const searchInput = editor.querySelector('.tag-search-input');
    const suggestionsListContainer = editor.querySelector('.tag-suggestions-list');
    const saveButton = editor.querySelector('.floating-tag-editor-footer .save-btn');
    const cancelButton = editor.querySelector('.floating-tag-editor-footer .cancel-btn');

    let localSelectedTags = [...selectedTags]; // 使用全局 selectedTags 的副本进行编辑
    let allAvailableTags = getAllUniqueTags();

    const renderSelectedTagsInEditorNew = () => {
        renderSelectedTagsInEditor(localSelectedTags, selectedTagsContainer, localSelectedTags, searchInput, suggestionsListContainer, allAvailableTags);
    };

    const renderTagSuggestionsNew = (term) => {
        renderTagSuggestions(allAvailableTags, term, suggestionsListContainer, localSelectedTags);
    };

    renderSelectedTagsInEditorNew();
    renderTagSuggestionsNew('');

    const closeEditorAndCleanup = (shouldSave = false) => {
        if (shouldSave) {
            selectedTags = [...localSelectedTags]; // 保存更改到全局 selectedTags
            updateTagsDisplay(); // 更新主输入栏的标签显示
        }
        editor.remove();
        document.removeEventListener('click', handleClickOutsideTagEditorNewTask, true);
        if (header) {
            // header.removeEventListener('mousedown', onDragStart); // 拖动逻辑的清理（如果添加）
        }
    };
    
    // 修改 handleClickOutsideTagEditor 为新任务标签编辑器特定的版本
    // 以避免与任务项标签编辑器的外部点击处理冲突
    window.handleClickOutsideTagEditorNewTask = (event) => {
        const activeEditor = document.getElementById('floating-tag-editor-active');
        // 检查点击目标是否为打开此编辑器的按钮
        const isTriggerButton = triggerElement && triggerElement.contains(event.target);

        if (activeEditor && !activeEditor.contains(event.target) && !isTriggerButton) {
            closeEditorAndCleanup(false); // 不保存更改
        }
    };

    closeButton.onclick = () => closeEditorAndCleanup(false);
    cancelButton.onclick = () => closeEditorAndCleanup(false);
    saveButton.onclick = () => closeEditorAndCleanup(true);

    searchInput.addEventListener('input', () => {
        renderTagSuggestionsNew(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTagValue = searchInput.value.trim();
            if (newTagValue) {
                const suggestionToClick = suggestionsListContainer.querySelector(`.tag-suggestion-item[data-tag="${newTagValue}"]`) || 
                                          suggestionsListContainer.querySelector('.create-new-tag');
                if (suggestionToClick) {
                    suggestionToClick.click();
                } else if (!localSelectedTags.includes(newTagValue)) {
                    localSelectedTags.push(newTagValue);
                    if (!allAvailableTags.includes(newTagValue)) {
                        allAvailableTags.push(newTagValue);
                        allAvailableTags.sort();
                    }
                    renderSelectedTagsInEditorNew();
                    searchInput.value = '';
                    renderTagSuggestionsNew('');
                } else {
                    searchInput.value = '';
                    renderTagSuggestionsNew('');
                }
                searchInput.focus();
            }
        }
    });

    suggestionsListContainer.addEventListener('click', function(event) {
        const target = event.target.closest('.tag-suggestion-item');
        if (!target) return;
        const tagValue = target.dataset.tag;

        if (target.classList.contains('create-new-tag')) {
            if (tagValue && !localSelectedTags.includes(tagValue)) {
                localSelectedTags.push(tagValue);
                if (!allAvailableTags.includes(tagValue)) {
                    allAvailableTags.push(tagValue);
                    allAvailableTags.sort();
                }
            }
        } else if (tagValue) {
            if (!localSelectedTags.includes(tagValue)) {
                localSelectedTags.push(tagValue);
            }
        }
        renderSelectedTagsInEditorNew();
        searchInput.value = '';
        renderTagSuggestionsNew('');
        searchInput.focus();
    });

    // 定位编辑器
    editor.style.display = 'flex';
    const rect = triggerElement.getBoundingClientRect();
    const mockEventForPositioning = { clientX: rect.left, clientY: rect.bottom + 5 }; 
    positionContextMenu(editor, mockEventForPositioning);
    editor.style.zIndex = '1270'; 
    searchInput.focus();

    setTimeout(() => {
        document.addEventListener('click', handleClickOutsideTagEditorNewTask, true);
    }, 0);

    // 拖动逻辑可以从 createFloatingTagEditor 借鉴并适配（可选）
} // {{modified}}


// 设置任务输入框事件
function setupTaskInput() {
    const taskInput = document.querySelector('.task-input-container .task-input');
    if (!taskInput) return;
    
    // 回车键添加任务
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && taskInput.value.trim() !== '') {
            // 创建新任务
            addTask(
                taskInput.value.trim(),
                window.DateSelector ? window.DateSelector.getSelectedValue() : '今天',
                selectedPriority,
                selectedTags
            );
            
            // 重置输入框和选项
            taskInput.value = '';
            resetTaskInputOptions();
        }
    });
    
    // 添加Backspace键删除最后一个标签的功能
    taskInput.addEventListener('keydown', (e) => {
        // 检查是否按下Backspace键
        if (e.key === 'Backspace' && selectedTags.length > 0) {
            // 检查以下两种情况：
            // 1. 输入框为空
            // 2. 输入框有内容但光标位于最前面（位置为0）
            if (taskInput.value === '' || taskInput.selectionStart === 0 && taskInput.selectionEnd === 0) {
                // 获取最后一个标签
                const lastTag = selectedTags[selectedTags.length - 1];
                
                // 移除最后一个标签
                removeSelectedTag(lastTag, selectedTags);
                
                // 更新标签选择器中的选中状态
                const tagSelector = document.querySelector('.task-tag-selector');
                if (tagSelector) {
                    const option = tagSelector.querySelector(`.tag-option[data-tag="${lastTag}"]`);
                    if (option) {
                        option.classList.remove('selected');
                    }
                }
                
                // 更新显示
                updateTagsDisplay();
                
                // 阻止默认行为
                e.preventDefault();
            }
        }
    });
    
    // 监听输入框内容变化，更新标签容器状态
    taskInput.addEventListener('input', updateTagContainerState);
    
    // 监听光标位置变化
    taskInput.addEventListener('click', updateTagContainerState);
    taskInput.addEventListener('keyup', function(e) {
        // 只在方向键按下时更新状态
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            updateTagContainerState();
        }
    });
    
    // 更新标签容器状态的函数
    function updateTagContainerState() {
        const tagsContainer = document.querySelector('.tags-container');
        if (tagsContainer && selectedTags.length > 0) {
            // 当输入框为空或光标在最前面时添加可删除提示类
            if (taskInput.value === '' || (taskInput.selectionStart === 0 && taskInput.selectionEnd === 0)) {
                tagsContainer.classList.add('backspace-ready');
            } else {
                tagsContainer.classList.remove('backspace-ready');
            }
        }
    }
    
    // 设置优先级选择器
    setupPrioritySelector();
    
    // 设置标签选择器
    setupTagSelector();

    // 新：为输入栏的优先级和标签图标按钮设置事件监听器
    const mainPriorityBtn = document.querySelector('.task-input-box .task-priority-selector');
    if (mainPriorityBtn) {
        mainPriorityBtn.onclick = null; // 移除HTML中可能存在的onclick
        mainPriorityBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showNewTaskPriorityMenu(this);
        });
    }

    const mainTagBtn = document.querySelector('.task-input-box .task-tag-selector');
    if (mainTagBtn) {
        mainTagBtn.onclick = null; // 移除HTML中可能存在的onclick
        mainTagBtn.addEventListener('click', function(e) {
           e.stopPropagation();
           showNewTaskTagEditor(this); // 实现此函数
        });
    }
}

// 渲染标签管理界面
function renderTagsManager() {
    const tagsManagerContainer = document.getElementById('tags-manager-container');
    const allTagsListElement = document.getElementById('all-tags-list');
    const tasksForTagTitleElement = document.getElementById('tasks-by-tag-title');
    const tasksForTagListElement = document.getElementById('tasks-for-selected-tag-list');

    if (!allTagsListElement || !tasksForTagTitleElement || !tasksForTagListElement) {
        return;
    }

    // 确保容器是可见的 (虽然 setupSidebarMenuItems 应该已经处理了，但双重检查)
    if (tagsManagerContainer && tagsManagerContainer.style.display === 'none') {
        tagsManagerContainer.style.display = 'block'; // 外层容器使用block布局，内部的tags-manager-layout会使用flex
    }

    // 清空右侧任务列表和标题
    tasksForTagTitleElement.textContent = '选择一个标签以查看任务';
    tasksForTagListElement.innerHTML = '';

    // 渲染左侧标签列表
    if (typeof renderAllTagsList === 'function') {
        renderAllTagsList();
    } else {
        allTagsListElement.innerHTML = '<li>Error: renderAllTagsList function missing.</li>';
    }
    // 更新侧边栏标签总数
    const uniqueTags = getAllUniqueTags(); 
    const tagManagerCountElement = document.querySelector('.sidebar .menu-item[data-section="tags-manager"] .count');
    if (tagManagerCountElement) {
        tagManagerCountElement.textContent = uniqueTags.length > 0 ? uniqueTags.length : '0';
    }
}

// 新函数：渲染所有标签到左侧列表
function renderAllTagsList() {
    const allTagsListElement = document.getElementById('all-tags-list');
    if (!allTagsListElement) {
        console.error("未找到ID为'all-tags-list'的元素");
        return;
    }
    allTagsListElement.innerHTML = ''; 

    const uniqueTagsWithCounts = getAllUniqueTagsWithCounts();

    if (uniqueTagsWithCounts.length === 0) {
        allTagsListElement.innerHTML = '<li class="empty-list-message">没有标签可显示。</li>';
        // 清空右侧面板标题
        const tasksForTagTitleElement = document.getElementById('tasks-by-tag-title');
        const tasksForTagListElement = document.getElementById('tasks-for-selected-tag-list');
        if (tasksForTagTitleElement) tasksForTagTitleElement.textContent = '选择一个标签以查看任务'; // 恢复默认标题
        if (tasksForTagListElement) tasksForTagListElement.innerHTML = ''; // 清空列表
        return;
    }

    uniqueTagsWithCounts.forEach(tagData => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-tag-name', tagData.name);
        listItem.classList.add('tag-list-item'); // 添加一个类方便样式控制

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-name';
        nameSpan.textContent = tagData.name;

        const countSpan = document.createElement('span');
        countSpan.className = 'tag-count';
        countSpan.textContent = `(${tagData.count})`;

        const actionsSpan = document.createElement('span');
        actionsSpan.className = 'tag-actions';

        const renameBtn = document.createElement('i');
        renameBtn.className = 'fas fa-edit tag-rename-btn';
        renameBtn.title = '重命名标签';
        renameBtn.addEventListener('click', (event) => {
            event.stopPropagation(); 
            if (typeof handleRenameTag === 'function') {
                handleRenameTag(tagData.name, listItem);
            } else {
                console.warn('handleRenameTag function not defined yet.');
            }
        });

        const deleteBtn = document.createElement('i');
        deleteBtn.className = 'fas fa-trash-alt tag-delete-btn';
        deleteBtn.title = '删除标签';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); 
            if (typeof handleDeleteTag === 'function') {
                handleDeleteTag(tagData.name);
            } else {
                console.warn('handleDeleteTag function not defined yet.');
            }
        });

        actionsSpan.appendChild(renameBtn);
        actionsSpan.appendChild(deleteBtn);

        const tagSummaryDiv = document.createElement('div'); // 新增：用于包裹标签名、计数和操作，以便Flexbox布局
        tagSummaryDiv.className = 'tag-summary-line'; // 添加类方便样式控制
        tagSummaryDiv.style.display = 'flex';
        tagSummaryDiv.style.alignItems = 'center';
        tagSummaryDiv.style.justifyContent = 'space-between';
        
        tagSummaryDiv.appendChild(nameSpan);
        tagSummaryDiv.appendChild(countSpan);
        tagSummaryDiv.appendChild(actionsSpan); // 将操作按钮也添加到 summary line

        const taskListContainer = document.createElement('ul'); // 新增：用于显示该标签下的任务
        taskListContainer.className = 'tag-tasks-list'; // 添加类
        taskListContainer.style.display = 'none'; // 默认隐藏
        taskListContainer.style.listStyleType = 'none';
        taskListContainer.style.paddingLeft = '0';
        taskListContainer.style.marginTop = '10px';

        listItem.appendChild(tagSummaryDiv); // 将 summary line 添加到 listItem
        listItem.appendChild(taskListContainer); // 将任务列表容器添加到 listItem

        listItem.addEventListener('click', () => {
            // 切换任务列表容器的显示状态
            const isHidden = taskListContainer.style.display === 'none';
            taskListContainer.style.display = isHidden ? 'block' : 'none'; // 或 flex

            // 移除其他选中项的选中状态
            document.querySelectorAll('#all-tags-list li.selected-tag-item').forEach(item => {
                 item.classList.remove('selected-tag-item');
                // 隐藏其下方的任务列表 (可选，如果希望一次只展开一个)
                const otherTaskList = item.querySelector('.tag-tasks-list');
                if(otherTaskList) otherTaskList.style.display = 'none';
            });

            // 如果当前项是展开的，添加选中状态并渲染任务
            if (isHidden) {
                listItem.classList.add('selected-tag-item');
                // 渲染该标签下的任务到其下方的容器
                if (typeof renderTasksForTag === 'function') {
                    renderTasksForTag(tagData.name, taskListContainer); // 将容器作为参数传递
                } else {
                    console.warn('renderTasksForTag function not defined yet.');
                    taskListContainer.innerHTML = '<li>任务加载功能待实现...</li>';
                }
            } else {
                // 如果当前项是折叠的，移除选中状态并清空任务列表 (可选)
                listItem.classList.remove('selected-tag-item');
                // taskListContainer.innerHTML = ''; // 清空任务列表以释放内存 (可选)
            }
        });
        allTagsListElement.appendChild(listItem);
    });
}

// 新辅助函数：获取所有唯一标签及其任务计数
function getAllUniqueTagsWithCounts() {
    const tagMap = {}; // 使用 Map 来存储标签名（小写）和对应的计数对象 { name: '原始大小写标签', count: 0 }

    // 1. 先将 allAvailableTagsList 中的标签添加到 Map 中，计数初始化为 0
    allAvailableTagsList.forEach(tag => {
         // 确保标签名是字符串且非空
        if (typeof tag === 'string' && tag.trim() !== '') {
            const trimmedTag = tag.trim();
            // 使用小写标签名作为 Map 的键，以便进行不区分大小写的查找
            const lowerCaseTag = trimmedTag.toLowerCase();
            // 无论如何都将标签添加到 Map 中，如果它不存在，则初始化计数为 0
            if (!tagMap.hasOwnProperty(lowerCaseTag)) { // 使用 hasOwnProperty 来检查 Map 中是否存在（更安全）
                 tagMap[lowerCaseTag] = { name: trimmedTag, count: 0 }; // 使用原始大小写存储
            }
        }
    });

    // 2. 遍历 tasks，统计标签计数并更新 Map
    tasks.forEach(task => {
        if (task.tags && Array.isArray(task.tags)) {
            task.tags.forEach(tag => {
                // 确保标签名是字符串且非空
                if (typeof tag === 'string' && tag.trim() !== '') {
                     const trimmedTag = tag.trim();
                     const lowerCaseTag = trimmedTag.toLowerCase();

                    if (tagMap.hasOwnProperty(lowerCaseTag)) { // 使用 hasOwnProperty 检查
                        // 如果标签已在 Map 中，增加计数
                         tagMap[lowerCaseTag].count++;
                    } else {
                        // 如果标签不在 Map 中，说明它只存在于任务中，而不在 allAvailableTagsList 里，添加到 Map，计数为 1
                         tagMap[lowerCaseTag] = { name: trimmedTag, count: 1 }; // 使用原始大小写存储
                         // 同时添加到 allAvailableTagsList
                         if (!allAvailableTagsList.includes(trimmedTag)) {
                             allAvailableTagsList.push(trimmedTag);
                         }
                    }
                }
            });
        }
    });

    // 保存更新后的标签列表到localStorage
    saveTagsList();

    // 3. 将 Map 中的值转换为数组，并进行排序 (按标签名的不区分大小写排序)
    // 直接从 Map 的值构建数组并排序
    const allTagsArray = Object.values(tagMap);

    allTagsArray.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
    return allTagsArray;
}

// 新函数：渲染指定标签下的任务到右侧列表 (修改为渲染到指定容器)
function renderTasksForTag(tagName, targetContainerElement) { // 接受 targetContainerElement 作为参数
    // 移除对右侧面板元素的获取
    // const tasksForTagTitleElement = document.getElementById('tasks-by-tag-title');
    // const tasksForTagListElement = document.getElementById('tasks-for-selected-tag-list');

    if (!targetContainerElement) {
        return;
    }

    // tasksForTagTitleElement.textContent = `标签 "${tagName}" 下的任务`; // 不再更新右侧标题
    // tasksForTagListElement.innerHTML = ''; // 清空右侧列表
    targetContainerElement.innerHTML = ''; // 清空目标容器

    const filteredTasks = tasks.filter(task => 
        task.tags && task.tags.includes(tagName) && task.status !== 'trashed' // 不显示已删除的任务
    );

    if (filteredTasks.length === 0) {
        targetContainerElement.innerHTML = '<li class="empty-list-message">此标签下没有任务。</li>'; // 修改消息显示位置
        return;
    }

    // 可选：按创建日期或其他方式排序
    filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 

    filteredTasks.forEach(task => {
        // 复用 createTaskElement 来创建任务项
        // 注意：createTaskElement 的第二个参数 viewType 可能需要根据实际情况调整
        // 这里暂时使用 'active'，但如果任务是 'completed'，其样式也应正确显示
        const taskElement = createTaskElement(task, task.status === 'COMPLETED' ? 'completed' : 'active'); 
        targetContainerElement.appendChild(taskElement); // 添加到指定容器
        
        // 为这些任务项添加右键菜单
        taskElement.addEventListener('contextmenu', (event) => {
            showTaskContextMenu(event, task.id, task.status === 'COMPLETED' ? 'completed' : 'active');
        });
    });
}

// 新函数：处理删除标签的逻辑
function handleDeleteTag(tagName) {
    showGenericConfirmModal(
        '确认删除标签',
        `确定要从所有任务中移除标签 "${tagName}" 吗？此操作会从所有相关任务中去掉该标签，但不会删除任务本身。标签 "${tagName}" 将不再存在。`,
        async () => {
            let tagWasRemoved = false;
            // 从任务中移除标签
            tasks.forEach(task => {
                if (task.tags && task.tags.includes(tagName)) {
                    task.tags = task.tags.filter(t => t !== tagName);
                    tagWasRemoved = true;
                }
            });

            // 从 allAvailableTagsList 中移除标签
            const tagIndex = allAvailableTagsList.indexOf(tagName);
            if (tagIndex !== -1) {
                allAvailableTagsList.splice(tagIndex, 1); // 从数组中删除该标签
                saveTagsList(); // 保存更新后的标签列表
                tagWasRemoved = true;
            }

            if (tagWasRemoved) {
                saveTasks(); // 保存更新后的任务
            }

            // 重新渲染整个标签管理器以反映变化
            renderTagsManager(); 
            // (renderTagsManager 会调用 renderAllTagsList, 
            // 并且会重置右侧面板的标题为默认值，如果被删除的标签之前是选中的，其任务列表会被清空)

            // 更新侧边栏标签总数
            const uniqueTags = getAllUniqueTags(); 
            const tagManagerCountElement = document.querySelector('.sidebar .menu-item[data-section="tags-manager"] .count');
            if (tagManagerCountElement) {
                tagManagerCountElement.textContent = uniqueTags.length > 0 ? uniqueTags.length : '0';
            }

            showTagManagerMessage(`标签 "${tagName}" 已从所有任务中移除。`, 'success');
        }
    );
}




// 新函数：处理重命名标签的逻辑
function handleRenameTag(oldTagName, listItem) {
    const tagSummaryLine = listItem.querySelector('.tag-summary-line'); // 获取标签概要行
    const tagNameSpan = listItem.querySelector('.tag-name'); // 获取标签名span
    const tagActionsSpan = listItem.querySelector('.tag-actions'); // 获取操作按钮span
    const taskListContainer = listItem.querySelector('.tag-tasks-list'); // 获取下方的任务列表容器

    if (!tagNameSpan || !tagActionsSpan || !tagSummaryLine) {
        return;
    }

    // 移除点击事件监听器，防止重复触发
    // listItem.removeEventListener('click', ...); // 如果需要移除，需要保存原始监听器引用

    // 隐藏标签名和操作按钮，显示输入框
    tagNameSpan.style.display = 'none';
    tagActionsSpan.style.display = 'none';
    
    // 将计数移到输入框旁边，或者先隐藏计数？先隐藏吧，简化布局
    const tagCountSpan = listItem.querySelector('.tag-count');
    if (tagCountSpan) tagCountSpan.style.display = 'none';

    // 创建输入框和操作按钮
    const renameInput = document.createElement('input');
    renameInput.type = 'text';
    renameInput.className = 'tag-rename-input';
    renameInput.value = oldTagName;
    renameInput.placeholder = '输入新标签名称...';
    renameInput.maxLength = 50; // 限制长度

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'simple-button primary-button';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'simple-button';
    cancelBtn.style.marginLeft = '5px';

    const renameActionsDiv = document.createElement('div'); // 新增一个容器包裹输入框和按钮
    renameActionsDiv.className = 'tag-rename-actions'; // 添加类方便样式
    renameActionsDiv.style.display = 'flex';
    renameActionsDiv.style.alignItems = 'center';
    renameActionsDiv.style.flexGrow = '1'; // 让容器填充空间

    renameActionsDiv.appendChild(renameInput);
    renameActionsDiv.appendChild(saveBtn);
    renameActionsDiv.appendChild(cancelBtn);

    // 将新的输入框和操作按钮插入到标签概要行中
    tagSummaryLine.insertBefore(renameActionsDiv, tagNameSpan); // 插入到标签名span之前

    // 聚焦输入框并选中当前文本
    renameInput.focus();
    renameInput.select();

    // 保存操作
    const saveRename = () => {
        const newTagName = renameInput.value.trim();
        if (newTagName === oldTagName) {
            // 没有改变，直接恢复显示
            cancelRename();
            return;
        }

        if (!newTagName) {
            showTagManagerMessage('标签名称不能为空', 'warning'); // 修改为使用页面消息
            renameInput.focus();
            return;
        }

        // 检查是否与现有标签重复 (不区分大小写)
        const lowerCaseNewTagName = newTagName.toLowerCase();
        const isDuplicate = allAvailableTagsList.some(tag => 
            tag.toLowerCase() === lowerCaseNewTagName && tag.toLowerCase() !== oldTagName.toLowerCase()
        );

        if (isDuplicate) {
            showTagManagerMessage(`标签 "${newTagName}" 已存在`, 'warning'); // 修改为使用页面消息
            renameInput.focus();
            renameInput.select();
            return;
        }

        // 更新 tasks 数组中的标签
        tasks.forEach(task => {
            if (task.tags && task.tags.includes(oldTagName)) {
                task.tags = task.tags.map(tag => tag === oldTagName ? newTagName : tag);
            }
        });

        // 更新 allAvailableTagsList
        const tagIndex = allAvailableTagsList.findIndex(tag => tag === oldTagName);
        if (tagIndex !== -1) {
            allAvailableTagsList[tagIndex] = newTagName; // 使用用户输入的大小写
        }

        saveTasks(); // 保存更新后的任务
        saveTagsList(); // 保存更新后的标签列表

        showTagManagerMessage(`标签 "${oldTagName}" 已成功重命名为 "${newTagName}"。`, 'success'); // 修改为使用页面消息

        // 恢复显示并刷新列表
        cancelRename(); // 先恢复原始显示结构
        // 如果下方的任务列表是可见的，刷新它
        if (taskListContainer && taskListContainer.style.display !== 'none') {
            renderTasksForTag(newTagName, taskListContainer); // 使用新的标签名和容器刷新
        }
        renderAllTagsList(); // 刷新整个标签列表以更新名称和计数
    };

    // 取消操作
    const cancelRename = () => {
        // 移除输入框和操作按钮
        renameActionsDiv.remove();

        // 恢复显示标签名和操作按钮
        tagNameSpan.style.display = '';
        tagActionsSpan.style.display = '';
        if (tagCountSpan) tagCountSpan.style.display = ''; // 恢复计数显示

        // 重新添加点击事件监听器 (如果之前移除了)
        // listItem.addEventListener('click', ...);
    };

    // 绑定事件监听器
    saveBtn.addEventListener('click', saveRename);
    cancelBtn.addEventListener('click', cancelRename);
    renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 防止回车提交表单
            saveRename();
        }
    });

    // 点击输入框或按钮外部区域取消编辑 (可选但推荐)
    // 可以考虑在模态框层面处理，或者更复杂的document点击监听器 + contains 检查
}

// 新增：添加新标签
function addNewTag(tagName) {
    const trimmedTagName = tagName.trim();
    if (!trimmedTagName) {
        showTagManagerMessage('标签名称不能为空', 'warning'); // 修改为使用页面消息
        return;
    }

    // 检查标签是否已存在 (不区分大小写)
    const lowerCaseTagName = trimmedTagName.toLowerCase();
    const tagExists = allAvailableTagsList.some(tag => tag.toLowerCase() === lowerCaseTagName);

    if (tagExists) {
        showTagManagerMessage(`标签 "${trimmedTagName}" 已存在`, 'warning'); // 修改为使用页面消息
        return;
    }

    // 添加新标签到列表
    allAvailableTagsList.push(trimmedTagName); // 保存用户输入的大小写
    saveTagsList(); // 保存更新后的标签列表

    showTagManagerMessage(`标签 "${trimmedTagName}" 已添加。`, 'success'); // 修改为使用页面消息

    // 刷新标签管理页面显示
    // 检查标签管理页面是否当前可见，如果可见则立即刷新
    const tagsManagerContainer = document.getElementById('tags-manager-container');
    if (tagsManagerContainer && tagsManagerContainer.style.display !== 'none') {
        renderAllTagsList(); // 刷新左侧标签列表以显示新标签
    }
    
}

// 更新日期显示在UI中
function updateDateDisplayInUI() {
    // 这个函数在日期选择器选择日期后被调用
    // 目前不需要额外操作，因为DateSelector._updateDisplay已经处理了显示更新
}

// 新增：使用临时任务对象打开编辑器
function openTaskEditorWithTempTask(tempTask) {
    if (!tempTask) {
        console.error('临时任务对象不能为空');
        return;
    }

    const modal = document.getElementById('task-editor-modal');
    const titleElement = document.getElementById('task-editor-title');
    const taskIdField = document.getElementById('task-editor-task-id');
    const textField = document.getElementById('task-editor-text');
    const dueDateField = document.getElementById('task-editor-due-date');

    if (!modal || !titleElement || !taskIdField || !textField || !dueDateField) {
        console.error('一个或多个任务编辑器模态框元素未找到');
        return;
    }

    titleElement.textContent = '编辑任务（临时同步）';
    taskIdField.value = tempTask.id;
    textField.value = tempTask.text;
    dueDateField.value = tempTask.dueDate ? tempTask.dueDate.split('T')[0] : '';

    modal.classList.add('visible');
    modal.style.display = 'flex';
    textField.focus();
}

// 初始化任务编辑器模态框的事件监听器