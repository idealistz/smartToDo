/**
 * 日期选择器组件
 * 管理任务日期选择功能
 */

// 移除了全局 selectedDate

class DateSelector {
    constructor(selectorElement, onChangeCallback) {
        if (!selectorElement) {
            console.error("DateSelector: selectorElement 是必需的.");
            return;
        }
        this.selectorElement = selectorElement;
        this.onChangeCallback = onChangeCallback || function() {}; // 默认的无操作回调

        this.dropdown = this.selectorElement.querySelector('.date-dropdown');
        this.dateText = this.selectorElement.querySelector('.date-text');
        this.customInput = this.selectorElement.querySelector('.custom-date-input');
    
        if (!this.dropdown || !this.dateText || !this.customInput) {
            console.error('DateSelector: 缺少必需的子元素:', this.selectorElement);
            // 可能抛出错误或返回以防止进一步的问题
            return;
        }

        this.currentSelectedValue = null; // 存储 YYYY-MM-DD 格式或预设值
        this.currentDisplayValue = ''; // 存储用户可见的显示字符串，默认为空字符串

        this._setupEventListeners();
        this.resetDisplay(); // 设置初始显示
    }

    _setupEventListeners() {
        // 避免重复添加事件监听器
        if (this.selectorElement._hasDateSelectorListeners) {
            return;
        }
        this.selectorElement._hasDateSelectorListeners = true;
        
        // 点击选择器以显示/隐藏下拉菜单
        this.selectorElement.addEventListener('click', (e) => {
            if (this.customInput.contains(e.target) || (e.target.closest && e.target.closest('.date-preset-option'))) {
                 // 如果点击的是自定义输入或预设选项，让它们的处理程序管理传播
                return;
            }
            e.stopPropagation();
            
            const isActive = this.dropdown.classList.contains('dropdown-active');

            if (window.DropdownManager && window.DropdownManager.closeAll) {
                // 关闭所有 *其他* 下拉菜单。
                document.querySelectorAll('.priority-dropdown.dropdown-active, .tag-dropdown.dropdown-active, .date-dropdown.dropdown-active').forEach(d => {
                    if (d !== this.dropdown) {
                        d.style.display = 'none';
                        d.classList.remove('dropdown-active');
                    }
                });
            } else {
                console.warn('DropdownManager.closeAll 不可用.');
            }
            
            if (isActive) { // 如果它是活动的，隐藏它
                this._closeDropdown();
            } else { // 如果它不是活动的，显示它
                this.dropdown.style.display = 'block';
                this.dropdown.classList.add('dropdown-active');
                // 当下拉菜单打开时显式显示自定义输入
                if (this.customInput) this.customInput.style.display = 'block'; 
                if (window.DropdownManager && window.DropdownManager.position) {
                    window.DropdownManager.position(this.dropdown, this.selectorElement);
                } else {
                    // 如果DropdownManager不可用，使用备用定位方法
                    this._positionDropdown();
                }
            }
        });

        // 添加全局点击事件处理，点击外部关闭下拉菜单
        // 使用唯一的处理函数引用，避免重复添加监听器
        this._documentClickHandler = (e) => {
            // 如果点击的不是日期选择器或其子元素，关闭下拉菜单
            if (this.dropdown.classList.contains('dropdown-active') && 
                !this.selectorElement.contains(e.target)) {
                this._closeDropdown();
            }
        };
        
        // 移除可能存在的旧监听器
        document.removeEventListener('click', this._documentClickHandler);
        // 添加新监听器
        document.addEventListener('click', this._documentClickHandler);

        // 预设日期选项
        const presetOptions = this.dropdown.querySelectorAll('.date-preset-option');
        presetOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                
                const dateInfo = DateSelector.getDateFromPreset(value);
                if (dateInfo) {
                    this.currentSelectedValue = dateInfo.value; // 存储 YYYY-MM-DD
                    this.currentDisplayValue = dateInfo.display;
                    this._updateDisplay();
                    this.onChangeCallback(this.currentSelectedValue);
                }
                this._closeDropdown(); // 点击任何预设选项后都关闭下拉
            });
        });
    
        // 自定义日期输入
        this.customInput.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止关闭下拉菜单
        });
        
        this.customInput.addEventListener('change', () => {
            if (this.customInput.value) {
                // 标准化为 YYYY-MM-DD 格式的输入来自 <input type="date">
                const date = new Date(this.customInput.value + 'T00:00:00'); // 确保解析为本地日期
                if (DateSelector.isValidDate(date)) {
                    const dateInfo = DateSelector.formatDateObj(date);
                    if (dateInfo) {
                        this.currentSelectedValue = dateInfo.value;
                        this.currentDisplayValue = dateInfo.display;
                        this._updateDisplay();
                        this.onChangeCallback(this.currentSelectedValue);
                    }
                    this._closeDropdown();
                    this.customInput.style.display = 'none';
                } else {
                    // 如果需要，处理自定义字段中的无效日期输入
                    console.warn("自定义字段中输入的日期无效:", this.customInput.value);
                }
            }
        });
        
        this.customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.customInput.value) {
                e.preventDefault();
                this.customInput.dispatchEvent(new Event('change'));
            }
        });
    }

    _updateDisplay() {
        if (this.currentSelectedValue && this.currentDisplayValue) {
            this.dateText.textContent = this.currentDisplayValue;
            this.dateText.classList.add('has-date');
            this.selectorElement.setAttribute('data-date', this.currentSelectedValue);
        } else {
            this.dateText.textContent = ''; // 修改为空字符串，不显示
            this.dateText.classList.remove('has-date');
            this.selectorElement.setAttribute('data-date', '');
        }
    }
    
    resetDisplay() {
        this.dateText.textContent = ''; // 修改为空字符串，不显示
        this.dateText.classList.remove('has-date');
        this.selectorElement.setAttribute('data-date', '');
        this.customInput.style.display = 'none';
        this.customInput.value = '';
    }

    _closeDropdown() {
        this.dropdown.style.display = 'none';
        this.dropdown.classList.remove('dropdown-active');
        // 确保在下拉菜单直接关闭时自定义输入也被隐藏
        if (this.customInput) this.customInput.style.display = 'none'; 
    }

    // 公共方法
    getSelectedValue() {
        return this.currentSelectedValue;
    }
    
    getSelectedSpecForStorage() { // 返回 YYYY-MM-DD 或 null
        return this.currentSelectedValue;
    }

    setValue(dateValue) { // dateValue 应该是 YYYY-MM-DD 或预设字符串
        if (!dateValue) {
            this.reset();
            return;
        }

        let dateInfo;
        // 首先检查它是否是预设关键字之一
        const presetKeywords = ['今天', '明天', '下周'];
        if (presetKeywords.includes(dateValue)) {
            dateInfo = DateSelector.getDateFromPreset(dateValue);
        } else { // 假设是 YYYY-MM-DD
            const date = new Date(dateValue + 'T00:00:00');
            if (DateSelector.isValidDate(date)) {
                dateInfo = DateSelector.formatDateObj(date);
            }
        }

        if (dateInfo) {
            this.currentSelectedValue = dateInfo.value;
            this.currentDisplayValue = dateInfo.display;
        } else { // 对于无法解析或不是预设的情况的回退
            this.currentSelectedValue = dateValue; // 如果无法解析为标准格式，则按原样存储
            this.currentDisplayValue = dateValue; // 按原样显示
        }
        this._updateDisplay();
        // this.onChangeCallback(this.currentSelectedValue); // 可选择在程序设置时触发回调
    }

    reset() {
        this.currentSelectedValue = null;
        this.currentDisplayValue = ''; // u4feeu6539u4e3au7a7au5b57u7b26u4e32
        this.resetDisplay();
        this.onChangeCallback(null); // 通知日期已被清除
    }

    // 静态辅助方法（可以是类的一部分或外部）
    static getDateFromPreset(preset) {
        switch (preset) {
            case '今天':
                return DateSelector.getTodayDate();
            case '明天':
                return DateSelector.getTomorrowDate();
            case '下周':
                return DateSelector.getNextWeekDate();
            default: 
                // 如果 preset 不是有效的预设值 (例如，如果用户通过某种方式点击了已移除的"自定义"HTML)
                // 则不执行任何操作或返回null，避免错误。
                // 由于"自定义"选项的HTML和JS逻辑都移除了，这里理论上不会接到 '自定义'
                console.warn("getDateFromPreset 被调用时传入了意外的值:", preset);
                return null; 
        }
    }

    static getTodayDate() {
        const today = new Date();
        return DateSelector.formatDateObj(today);
    }

    static getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return DateSelector.formatDateObj(tomorrow);
    }

    static getNextWeekDate() {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return DateSelector.formatDateObj(nextWeek);
    }

    static formatDateObj(date) {
        if (!DateSelector.isValidDate(date)) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return {
            value: `${year}-${month}-${day}`, // 存储和 <input type="date"> 的标准值
            display: `${parseInt(month)}月${parseInt(day)}日`
        };
    }

    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }

    // 静态方法生成新的日期选择器的 HTML
    // 注意：此 HTML 应与构造函数所期望的匹配
    static createHTML() {
        return `
            <i class="fa-regular fa-calendar"></i>
            <span class="date-text"></span>
            <div class="date-dropdown">
                <div class="date-preset-option" data-value="今天"><i class="fa-regular fa-calendar-check"></i><span>今天</span></div>
                <div class="date-preset-option" data-value="明天"><i class="fa-regular fa-calendar-day"></i><span>明天</span></div>
                <div class="date-preset-option" data-value="后天"><i class="fa-regular fa-calendar-days"></i><span>后天</span></div>
                <div class="date-preset-option" data-value="下周"><i class="fa-regular fa-calendar-week"></i><span>下周</span></div>
                <div class="date-preset-option" data-value="自定义"><i class="fa-regular fa-calendar-alt"></i><span>自定义</span></div>
                <input type="date" class="custom-date-input" style="display: none;">
            </div>
        `;
    }

    // 新方法
    selectDate(date) {
        if (!DateSelector.isValidDate(date)) {
            console.warn('selectDate 被使用了无效的日期:', date);
            return;
        }
        
        const dateInfo = DateSelector.formatDateObj(date);
        if (dateInfo) {
            this.currentSelectedValue = dateInfo.value;
            this.currentDisplayValue = dateInfo.display;
            this._updateDisplay();
            this.onChangeCallback(this.currentSelectedValue);
        }
    }

    hideDropdown() {
        this._closeDropdown();
        
        // 确保所有相关元素都被正确隐藏
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
            this.dropdown.classList.remove('dropdown-active');
        }
        
        if (this.customInput) {
            this.customInput.style.display = 'none';
        }
    }

    // 添加备用定位方法
    _positionDropdown() {
        // 重置位置
        this.dropdown.style.top = '';
        this.dropdown.style.left = '';
        this.dropdown.style.bottom = '';
        this.dropdown.style.right = '';
        
        // 获取选择器元素和窗口的尺寸和位置
        const selectorRect = this.selectorElement.getBoundingClientRect();
        const dropdownRect = this.dropdown.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        
        // 计算下拉菜单的理想位置
        let top = selectorRect.bottom;
        let left = selectorRect.left;
        
        // 检查是否会超出底部
        if (top + dropdownRect.height > windowHeight) {
            // 如果超出底部，将下拉菜单放在选择器上方
            top = selectorRect.top - dropdownRect.height;
        }
        
        // 检查是否会超出右侧
        if (left + dropdownRect.width > windowWidth) {
            // 如果超出右侧，将下拉菜单向左对齐
            left = windowWidth - dropdownRect.width - 10; // 10px的边距
        }
        
        // 应用位置
        this.dropdown.style.position = 'fixed';
        this.dropdown.style.top = `${top}px`;
        this.dropdown.style.left = `${left}px`;
    }
}

// 移除旧的全局初始化和导出
// document.addEventListener('DOMContentLoaded', initDateSelectors); // 旧方法

// 导出类
window.DateSelector = DateSelector; 