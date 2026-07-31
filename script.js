console.log("Apple 风格首页启动成功！");

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("exploreBtn");

    if (button) {
        button.addEventListener("click", () => {
            window.open("explore.html", "_blank", "noopener,noreferrer");
        });
    }
});