const API_BASE_URL = '/api/v1';

window.AuthManager = (() => {
    let currentUser = null;
    let accessToken = null;
    // let refreshToken = null; // 未来使用

    // DOM 元素
    let loginModal, registerModal, appContainer;
    let loginForm, registerForm;
    let loginUsernameInput, loginPasswordInput, loginErrorMsg, loginSubmitBtn;
    let registerUsernameInput, registerPasswordInput, registerConfirmPasswordInput, registerErrorMsg, registerSubmitBtn;
    let showRegisterLink, showLoginLink;
    let authModalCloseBtns;

    // 用户个人资料元素
    let userProfileModal; // 保留模态框本身
    let avatarPreview, avatarUploadInput, profileUsernameInput, profileSaveBtn, profileCancelBtn, profileCloseBtn;

    // 新的用户头像和弹出菜单元素
    let tabNavUserAvatar, userActionsPopup, popupEditProfileBtn, popupLogoutBtn;

    function cacheDOMElements() {
        loginModal = document.getElementById('login-modal');
        registerModal = document.getElementById('register-modal');
        appContainer = document.querySelector('.app-container'); // 主应用容器

        if (loginModal) {
            loginForm = loginModal.querySelector('.auth-modal-body'); // 假设表单是主体
            loginUsernameInput = loginModal.querySelector('#login-username');
            loginPasswordInput = loginModal.querySelector('#login-password');
            loginErrorMsg = loginModal.querySelector('#login-error-message');
            loginSubmitBtn = loginModal.querySelector('#login-submit-btn');
            showRegisterLink = loginModal.querySelector('#show-register-link');
        }

        if (registerModal) {
            registerForm = registerModal.querySelector('.auth-modal-body');
            registerUsernameInput = registerModal.querySelector('#register-username');
            registerPasswordInput = registerModal.querySelector('#register-password');
            registerConfirmPasswordInput = registerModal.querySelector('#register-confirm-password');
            registerErrorMsg = registerModal.querySelector('#register-error-message');
            registerSubmitBtn = registerModal.querySelector('#register-submit-btn');
            showLoginLink = registerModal.querySelector('#show-login-link');
        }
        authModalCloseBtns = document.querySelectorAll('.auth-modal-close');
        
        // 缓存用户个人资料模态框元素 (这些保持不变)
        userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            avatarPreview = document.getElementById('avatar-preview');
            avatarUploadInput = document.getElementById('avatar-upload');
            profileUsernameInput = document.getElementById('profile-username');
            profileSaveBtn = document.getElementById('user-profile-save-btn');
            profileCancelBtn = document.getElementById('user-profile-cancel-btn');
            profileCloseBtn = document.getElementById('user-profile-close-btn');
        }

        // 缓存新的用户头像和弹出菜单元素
        tabNavUserAvatar = document.getElementById('tab-nav-user-avatar');
        userActionsPopup = document.getElementById('user-actions-popup');
        popupEditProfileBtn = document.getElementById('popup-edit-profile');
        popupLogoutBtn = document.getElementById('popup-logout');
    }

    function showLoginModal() {
        if (registerModal) {
            registerModal.classList.remove('visible');
            registerModal.style.display = 'none'; // 确保其他模态框被隐藏
        }
        if (loginModal) {
            loginModal.classList.add('visible');
            loginModal.style.display = 'flex'; // 明确设置显示
            if (loginUsernameInput) loginUsernameInput.focus();
            document.body.classList.add('modal-open');
            if(loginErrorMsg) loginErrorMsg.textContent = ''; // 清除之前的错误
        }
    }

    function hideLoginModal() {
        if (loginModal) {
            loginModal.classList.remove('visible');
            loginModal.style.display = 'none'; // 明确设置显示
        }
        if (!registerModal || !registerModal.classList.contains('visible')) {
            // 在移除 body 类之前检查注册模态框是否也不可见
            const isRegisterVisible = registerModal && registerModal.style.display === 'flex';
            if (!isRegisterVisible) {
                 document.body.classList.remove('modal-open');
            }
        }
    }

    function showRegisterModal() {
        if (loginModal) {
            loginModal.classList.remove('visible');
            loginModal.style.display = 'none'; // 确保其他模态框被隐藏
        }
        if (registerModal) {
            registerModal.classList.add('visible');
            registerModal.style.display = 'flex'; // 明确设置显示
            if (registerUsernameInput) registerUsernameInput.focus();
            document.body.classList.add('modal-open');
            if(registerErrorMsg) registerErrorMsg.textContent = ''; // 清除之前的错误
        }
    }

    function hideRegisterModal() {
        if (registerModal) {
            registerModal.classList.remove('visible');
            registerModal.style.display = 'none'; // 明确设置显示
        }
        // 在移除 body 类之前检查登录模态框是否也不可见
        if (!loginModal || !loginModal.classList.contains('visible')) {
            const isLoginVisible = loginModal && loginModal.style.display === 'flex';
            if (!isLoginVisible) {
                document.body.classList.remove('modal-open');
            }
        }
    }
    
    function showProfileModal() {
        if (!userProfileModal) return;
        
        // 填充模态框数据
        if (currentUser) {
            try {
                const userInfo = typeof currentUser === 'string' ? JSON.parse(currentUser) : currentUser;
                
                // 设置用户名
                if (profileUsernameInput && userInfo.username) {
                    profileUsernameInput.value = userInfo.username;
                }
                
                // 设置头像
                if (avatarPreview) {
                    const savedAvatar = localStorage.getItem(`user_avatar_${userInfo.username}`);
                    if (savedAvatar) {
                        avatarPreview.src = savedAvatar;
                    } else {
                        avatarPreview.src = 'images/default-avatar.png';
                    }
                }
            } catch (e) {
                console.error('解析用户数据出错:', e);
            }
        }
        
        userProfileModal.style.display = 'flex';
        userProfileModal.classList.add('visible');
        document.body.classList.add('modal-open');
    }
    
    function hideProfileModal() {
        if (!userProfileModal) return;
        
        userProfileModal.classList.remove('visible');
        userProfileModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('请选择图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (avatarPreview) {
                avatarPreview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
    
    function saveUserProfile() {
        if (!currentUser) return;
        
        try {
            const userInfo = typeof currentUser === 'string' ? JSON.parse(currentUser) : currentUser;
            
            // 保存头像
            if (avatarPreview && avatarPreview.src) {
                localStorage.setItem(`user_avatar_${userInfo.username}`, avatarPreview.src);
                
                // 更新新的导航栏头像
                if (tabNavUserAvatar) {
                    tabNavUserAvatar.src = avatarPreview.src;
                }
            }
            
            // 在这里可以添加更多用户信息保存逻辑
            
            hideProfileModal();
        } catch (e) {
            console.error('保存用户资料时出错:', e);
        }
    }
    
    function updateUIAfterLogin() {
        hideLoginModal();
        hideRegisterModal();
        if (appContainer) appContainer.style.display = 'flex'; // 或者你的默认显示样式
        
        // 更新用户信息显示
        if (currentUser) {
            try {
                const userInfo = typeof currentUser === 'string' ? JSON.parse(currentUser) : currentUser;
                
                // 更新新的导航栏头像
                if (tabNavUserAvatar) { 
                    const savedAvatar = localStorage.getItem(`user_avatar_${userInfo.username}`);
                    if (savedAvatar) {
                        tabNavUserAvatar.src = savedAvatar;
                    } else {
                        tabNavUserAvatar.src = 'images/default-avatar.png';
                    }
                }
            } catch (e) {
                console.error('更新用户界面时出错:', e);
            }
        }
        
        console.log('用户已登录:', currentUser);
    }

    function updateUIAfterLogout() {
        if (appContainer) appContainer.style.display = 'none';
        
        // 重置新的导航栏头像
        if (tabNavUserAvatar) {
            tabNavUserAvatar.src = 'images/default-avatar.png';
        }
        
        hideUserActionsPopup(); // 确保登出时隐藏弹出菜单
        showLoginModal();
        console.log('用户已登出');
    }

    async function handleLogin(event) {
        event.preventDefault();
        if (!loginUsernameInput || !loginPasswordInput || !loginErrorMsg || !loginSubmitBtn) return;

        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!username || !password) {
            loginErrorMsg.textContent = '用户名和密码不能为空。';
            return;
        }
        loginErrorMsg.textContent = '';
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = '登录中...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                accessToken = data.accessToken;
                currentUser = data.user;
                // if (data.refreshToken) refreshToken = data.refreshToken;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUIAfterLogin();
            } else {
                loginErrorMsg.textContent = data.error?.message || '登录失败，请检查您的凭据。';
            }
        } catch (error) {
            console.error('登录错误:', error);
            loginErrorMsg.textContent = '登录请求失败，请稍后再试。';
        }
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = '登录';
    }

    async function handleRegister(event) {
        event.preventDefault();
        if (!registerUsernameInput || !registerPasswordInput || !registerConfirmPasswordInput || !registerErrorMsg || !registerSubmitBtn) return;

        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value.trim();
        const confirmPassword = registerConfirmPasswordInput.value.trim();

        if (!username || !password || !confirmPassword) {
            registerErrorMsg.textContent = '用户名、密码和确认密码不能为空。';
            return;
        }
        if (password !== confirmPassword) {
            registerErrorMsg.textContent = '两次输入的密码不匹配。';
            return;
        }
        if (password.length < 8) {
            registerErrorMsg.textContent = '密码长度至少为8个字符。';
            return;
        }

        registerErrorMsg.textContent = '';
        registerSubmitBtn.disabled = true;
        registerSubmitBtn.textContent = '注册中...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                alert('注册成功！现在您可以登录了。'); // 目前简单的提示
                showLoginModal(); 
                if(registerForm) {
                    // registerForm.reset(); // 如果表单只是一个 div，这可能无法直接工作
                    registerUsernameInput.value = '';
                    registerPasswordInput.value = '';
                    registerConfirmPasswordInput.value = '';
                }
            } else {
                registerErrorMsg.textContent = data.error?.message || '注册失败，请稍后再试。';
            }
        } catch (error) {
            console.error('注册错误:', error);
            registerErrorMsg.textContent = '注册请求失败，请稍后再试。';
        }
        registerSubmitBtn.disabled = false;
        registerSubmitBtn.textContent = '注册';
    }

    function logoutUser() {
        accessToken = null;
        currentUser = null;
        // refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        // TODO: 如果后端支持令牌失效，调用 POST /auth/logout
        updateUIAfterLogout();
    }
    
    function getToken() {
        return accessToken;
    }

    function isLoggedIn() {
        return !!accessToken && !!currentUser;
    }

    function getCurrentUser() {
        return currentUser;
    }

    function attachAuthHeader(headers = {}) {
        if (accessToken) {
            return { ...headers, 'Authorization': `Bearer ${accessToken}` };
        }
        return headers;
    }

    function bindEvents() {
        if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', handleLogin);
        if (registerSubmitBtn) registerSubmitBtn.addEventListener('click', handleRegister);

        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                showRegisterModal();
            });
        }
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginModal();
            });
        }
        authModalCloseBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modalId;
                if (modalId === 'login-modal') hideLoginModal();
                else if (modalId === 'register-modal') hideRegisterModal();
            });
        });
        
        // 绑定新的用户头像和弹出菜单事件
        if (tabNavUserAvatar) {
            tabNavUserAvatar.addEventListener('click', (event) => {
                event.stopPropagation(); // 防止触发下面的 document 点击事件
                toggleUserActionsPopup();
            });
        }

        if (popupEditProfileBtn) {
            popupEditProfileBtn.addEventListener('click', () => {
                showProfileModal();
                hideUserActionsPopup(); // 操作后隐藏弹出菜单
            });
        }

        if (popupLogoutBtn) {
            popupLogoutBtn.addEventListener('click', () => {
                logoutUser(); 
            });
        }

        // 点击外部关闭弹出菜单
        document.addEventListener('click', (event) => {
            if (userActionsPopup && userActionsPopup.style.display === 'block') {
                if (tabNavUserAvatar && !tabNavUserAvatar.contains(event.target) && !userActionsPopup.contains(event.target)) {
                    hideUserActionsPopup();
                }
            }
        });
        
        // 绑定个人资料编辑模态框事件 (这些保持不变)
        if (avatarUploadInput) {
            avatarUploadInput.addEventListener('change', handleAvatarUpload);
        }
        
        if (profileSaveBtn) {
            profileSaveBtn.addEventListener('click', saveUserProfile);
        }
        
        if (profileCancelBtn) {
            profileCancelBtn.addEventListener('click', hideProfileModal);
        }
        
        if (profileCloseBtn) {
            profileCloseBtn.addEventListener('click', hideProfileModal);
        }
    }

    function init() {
        cacheDOMElements();
        bindEvents();

        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('currentUser');

        if (storedToken && storedUser) {
            accessToken = storedToken;
            try {
                currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('解析存储用户时出错:', e);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('currentUser');
                accessToken = null;
                currentUser = null;
            }
        }
        
        // TODO: 添加检查后端以验证令牌是否仍然有效 (例如: GET /auth/me)
        // 目前，我们假设如果令牌和用户存在于 localStorage 中，它们就是有效的。

        if (isLoggedIn()) {
            updateUIAfterLogin();
        } else {
            showLoginModal(); 
            if(appContainer) appContainer.style.display = 'none'; // 如果未登录则隐藏主应用
        }
    }

    // 新增辅助函数
    function toggleUserActionsPopup() {
        if (!userActionsPopup) return;
        const isVisible = userActionsPopup.style.display === 'block';
        userActionsPopup.style.display = isVisible ? 'none' : 'block';
    }

    function hideUserActionsPopup() {
        if (userActionsPopup) {
            userActionsPopup.style.display = 'none';
        }
    }

    return {
        init,
        showLoginModal,
        logoutUser,
        getToken,
        isLoggedIn,
        getCurrentUser,
        attachAuthHeader,
        showProfileModal
    };
})(); 