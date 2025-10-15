import { initGame } from "./game.js";
import { initStats } from "./stats.js";
import { initMenu } from "./menu.js";
import { initProfile, handleOAuthCallback } from "./profile.js";
import { initTournament } from "./tournament.js";
import initRemoteGame from "./remoteGame.js";
import { initHistory } from "./history.js";
import { i18n } from "./i18n/index.js";
const app = document.getElementById("app");
const error_404_path = "./html/404.html";
const routes = {
    "/": "./html/home.html",
    "/pong": "./html/pong.html",
    "/pong/online": "./html/pong.html", //temporary
    "/stats": "./html/stats.html",
    "/tournament": "./html/tournament.html",
    "/profile": "./html/profile.html",
    "/oauth-callback": "./html/profile.html",
    "/history": "./html/history.html"
};
const initScripts = {
    "/": () => {
        if (typeof initMenu === "function")
            initMenu();
    },
    "/pong": () => {
        if (typeof initGame === "function")
            initGame();
    },
    "/stats": () => {
        if (typeof initStats === "function")
            initStats();
    },
    "/profile": () => {
        if (typeof initProfile === "function")
            initProfile();
    },
    "/tournament": () => {
        if (typeof initTournament === "function")
            initTournament();
    },
    "/pong/online": () => {
        if (typeof initRemoteGame === "function")
            initRemoteGame();
    },
    "/history": () => {
        if (typeof initHistory === "function")
            initHistory();
    },
    "/oauth-callback": () => {
        if (typeof handleOAuthCallback === "function")
            handleOAuthCallback();
    }
};
async function load404(push) {
    const res = await fetch(error_404_path);
    app.innerHTML = await res.text();
    if (push)
        history.pushState({ path: "404" }, "", "/404.");
    update_event();
}
function update_event() {
    app.querySelectorAll("[data-route]").forEach(btn => {
        const element = btn;
        if (element.id === 'one-player-btn' || element.id === 'two-players-btn' || element.id == 'four-players-btn')
            return;
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const path = e.currentTarget.dataset.route;
            navigate(path);
        });
    });
}
async function navigate(path, push = true) {
    const file = routes[path];
    if (file) {
        try {
            const res = await fetch(file);
            if (!res.ok)
                throw new Error("File not found.");
            app.innerHTML = await res.text();
            if (push)
                history.pushState({ path }, "", path);
            update_event();
            // Initialize i18n for the new page
            i18n.initializePage();
            if (initScripts[path])
                initScripts[path]();
        }
        catch {
            load404(push);
        }
    }
    else
        load404(push);
}
window.onpopstate = (e) => {
    const path = e.state?.path || location.pathname;
    navigate(path, false);
};
navigate(location.pathname, false);
//# sourceMappingURL=app.js.map