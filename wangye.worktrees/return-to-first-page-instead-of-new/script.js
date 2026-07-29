const app = document.getElementById('app');

function getRouteFromLocation() {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') === 'second' ? 'second' : 'first';
}

function render(route) {
    if (route === 'second') {
        app.innerHTML = `
            <section class="hero secondary">
                <div class="left">
                    <span class="eyebrow">第二页</span>
                    <h1>欢迎来到第二页</h1>
                    <p>这个页面会把浏览器历史记录推进到第二个入口。点击返回后，浏览器会回到第一个页面，而不是再添加一个新的第一页。</p>
                    <button id="back-to-first">返回第一个页面</button>
                </div>
                <div class="right">
                    <div class="visual-card"></div>
                </div>
            </section>
        `;
    } else {
        app.innerHTML = `
            <section class="hero">
                <div class="left">
                    <h1>Designing<br>the Future.</h1>
                    <p>探索设计、生命、哲学与宇宙。</p>
                    <button id="go-to-second">进入第二页</button>
                </div>
                <div class="right">
                    <div class="visual-card"></div>
                </div>
            </section>
        `;
    }

    bindEvents();
}

function bindEvents() {
    const toSecondButton = document.getElementById('go-to-second');
    if (toSecondButton) {
        toSecondButton.addEventListener('click', () => {
            history.pushState({ page: 'second' }, '', '?page=second');
            render('second');
        });
    }

    const backButton = document.getElementById('back-to-first');
    if (backButton) {
        backButton.addEventListener('click', () => {
            history.back();
        });
    }
}

function initializeRoute() {
    const route = getRouteFromLocation();
    history.replaceState({ page: route }, '', route === 'second' ? '?page=second' : '/');
    render(route);
}

window.addEventListener('popstate', () => {
    render(getRouteFromLocation());
});

initializeRoute();