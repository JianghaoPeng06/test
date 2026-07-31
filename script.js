// ============================================================
// 特效脚本（页面切换 + 导航高亮 + 卡片动画重置 + 浏览器历史支持）
// ============================================================
(function() {
    "use strict";

    // 获取页面元素
    const pages = {
        home: document.getElementById('page-home'),
        portfolio: document.getElementById('page-portfolio')
    };
    const navLinks = document.querySelectorAll('.nav-links a');
    const triggers = document.querySelectorAll('[data-page]');

    // 核心切换函数
    function switchPage(pageId, updateHistory = true) {
        // 1. 隐藏所有页面
        Object.values(pages).forEach(p => {
            if (p) p.classList.remove('active');
        });

        // 2. 显示目标页面
        const target = pages[pageId];
        if (target) {
            target.classList.add('active');

            // 如果切换到作品页，重新触发卡片交错动画
            if (pageId === 'portfolio') {
                const cards = target.querySelectorAll('.project-card');
                cards.forEach((card, index) => {
                    card.style.animation = 'none';
                    void card.offsetHeight; // 强制回流
                    card.style.animation = `cardUp 0.7s ease-out forwards ${0.15 + index * 0.15}s`;
                });
            }
        }

        // 3. 更新导航高亮
        navLinks.forEach(link => link.classList.remove('active'));
        if (pageId === 'portfolio') {
            navLinks.forEach(link => {
                if (link.dataset.page === 'portfolio') {
                    link.classList.add('active');
                }
            });
        }
        // 首页时所有导航取消高亮（因为“关于/世界观/联系”都指向首页，但不做高亮）

        // 4. 更新浏览器历史记录（防止刷新后丢失状态）
        if (updateHistory) {
            const state = { page: pageId };
            const title = pageId === 'home' ? 'JasperPeng' : '作品 · JasperPeng';
            // 使用 pushState 或 replaceState，这里用 pushState 以便后退
            history.pushState(state, title, `?page=${pageId}`);
            document.title = title;
        }
    }

    // 监听浏览器前进/后退按钮
    window.addEventListener('popstate', function(event) {
        const pageId = event.state && event.state.page ? event.state.page : 'home';
        // 从历史记录恢复时，不需要再次 pushState
        switchPage(pageId, false);
    });

    // 绑定所有点击触发器（导航、按钮、返回链接）
    triggers.forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page && pages[page]) {
                switchPage(page, true);
            }
        });
    });

    // ===== 初始化 =====
    // 1. 检查 URL 参数，支持直接访问 ?page=portfolio
    const urlParams = new URLSearchParams(window.location.search);
    const initPage = urlParams.get('page') || 'home';
    
    // 2. 确保首页或作品页存在
    if (pages[initPage]) {
        // 先清除所有 active
        Object.values(pages).forEach(p => p.classList.remove('active'));
        pages[initPage].classList.add('active');
        
        // 如果是作品页，触发卡片动画
        if (initPage === 'portfolio') {
            const cards = pages.portfolio.querySelectorAll('.project-card');
            cards.forEach((card, index) => {
                card.style.animation = 'none';
                void card.offsetHeight;
                card.style.animation = `cardUp 0.7s ease-out forwards ${0.15 + index * 0.15}s`;
            });
            // 高亮导航
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === 'portfolio') link.classList.add('active');
            });
        } else {
            navLinks.forEach(link => link.classList.remove('active'));
        }
        // 更新标题
        document.title = initPage === 'home' ? 'JasperPeng' : '作品 · JasperPeng';
        
        // 同步历史状态（用 replaceState 避免重复记录）
        history.replaceState({ page: initPage }, document.title, `?page=${initPage}`);
    } else {
        // 默认回退到首页
        switchPage('home', true);
    }
})();