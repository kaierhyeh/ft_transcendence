import {initMenu} from "./menu/menu.js";
import { initLanguages } from "./i18n/index.js";
import {initTournament} from "./tournament.js";
import initRemoteGame, { cleanupRemoteGame } from "./remoteGame.js";
import {initHistory} from "./history.js";
import { i18n } from "./i18n/index.js";
// import { addBrowserClass, logBrowserInfo } from "./utils/browserDetect.js";
// import { initDeviceDetection } from "./utils/deviceDetect.js";
import {loadHeader} from "./header.js";
import { initSignup } from "./auth/signup.js";
import { initLogin, handleOAuthCallback } from "./auth/login.js";
import { initSettings } from "./user/settings.js";
import { initPong } from "./pong.js";
import { initProfile } from "./user/profile.js";
import { initArena, cleanupArena } from "./arena.js";
import { chatSocket } from "./menu/menu.ws.js";

const app = document.getElementById("app") as HTMLElement;

const error_404_path = "./html/404.html";
const routes: Record<string, string> = {
	"/": "./html/home.html",
	"/pong": "./html/pong.html",
	"/online": "./html/pong.html", //temporary
	"/tournament": "./html/tournament.html",
	"/user/profile": "./html/user/profile.html",
	// "/oauth-callback": "./html/profile.html",
	"/history": "./html/history.html",
	"/user/settings":"./html/user/settings.html",
	"/user/friends": "./html/user/friends.html",
	"/user/block-list": "./html/user/block_list.html",
	"/signup": "./html/auth/signup.html",
	"/login": "./html/auth/login.html",
	"/auth/google/callback": "./html/auth/login.html", // Temporary page while processing OAuth
	"/arena": "./html/arena/arena.html",
};

const initScripts: Record<string, () => void> = {
	"/": () => {
		if (typeof initMenu === "function")
			initMenu();
		if (typeof initLanguages === "function")
			initLanguages();
	},
	"/pong": () => {
		if (typeof initPong === "function")
			initPong();
		if (typeof initLanguages === "function")
			initLanguages();
	},
	"/signup": () => {
		if (typeof initSignup === "function")
			initSignup();
		if (typeof initLanguages === "function")
			initLanguages();
	},
	"/login": () => {
		if (typeof initLogin === "function")
			initLogin();
		if (typeof initLanguages === "function")
			initLanguages();
	},
	"/tournament": () => {
		if (typeof initTournament === "function")
			initTournament();
	},
	"/online": () => {
		if (typeof initRemoteGame === "function")
			initRemoteGame();
	},
	"/history": () => {
		if (typeof initHistory === "function")
			initHistory();
	},
	"/user/settings": () => {
		if (typeof initSettings === "function")
			initSettings();
	},
	"/user/profile": () => {
		if (typeof initSettings === "function")
			initProfile();
	},
	"/auth/google/callback": () => {
		if (typeof handleOAuthCallback === "function")
			handleOAuthCallback();
	},
	"/arena": () => {
		if (typeof initArena === "function")
			initArena();
	}
};

async function load404(push: boolean)
{
	const res = await fetch(error_404_path);
	app.innerHTML = await res.text();
	if (push)
		history.pushState({path: "404"}, "", "/404.");
	
	await loadHeader();
	update_event();
}

function update_event()
{
	// Search app for data-route elements (header handles its own listeners)
	app.querySelectorAll("[data-route]").forEach(btn => {
		const element = btn as HTMLElement;
		if (element.id === 'one-player-btn' || element.id === 'two-players-btn' || element.id == 'four-players-btn') return;
		
		// Remove existing listener to prevent duplicates (if already attached)
		const newBtn = btn.cloneNode(true) as HTMLElement;
		btn.parentNode?.replaceChild(newBtn, btn);
		
		newBtn.addEventListener("click", (e) => {
			e.preventDefault();
			chatSocket?.close(1000, "User navigating away");
			const path = (e.currentTarget as HTMLElement).dataset.route!;
			navigate(path);
		});
	});
}

async function navigate(path: string, push: boolean = true)
{
	// Cleanup remote game connections when leaving /online page
	const currentPath = window.location.pathname;
	if (currentPath === "/online" && path !== "/online") {
		cleanupRemoteGame();
	}

	// Cleanup tournament when leaving /tournament page
	if (currentPath === "/tournament" && path !== "/tournament") {
		if ((window as any).cleanupTournament) {
			(window as any).cleanupTournament();
		}
	}

	//clean up locals pongs
	if (currentPath === "/pong" && path !== "/pong") {
		if ((window as any).cleanupPong) {
			(window as any).cleanupPong();
		}
	}

	//clean up arena game
	if (currentPath === "/arena" && path !== "/arena") {
		cleanupArena();
	}

	// Split path and query string
	const [basePath, queryString] = path.split('?');
	const file = routes[basePath];

	if (file)
	{
		try {
			if (basePath === '/login' && push) {
				const currentPath = window.location.pathname;
				if (currentPath !== '/login' && currentPath !== '/signup') {
					sessionStorage.setItem('previousPage', currentPath);
				}
			}

			const res = await fetch(file);
			if (!res.ok)
				throw new Error("File not found.");
			app.innerHTML = await res.text();
			if (push)
				history.pushState({path}, "", path); // Push full path with query params
			
			await loadHeader();
			update_event();
			i18n.initializePage();
			if (initScripts[basePath])
				initScripts[basePath]();
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

// Make navigate available globally for header and other components
(window as any).navigateTo = navigate;

// addBrowserClass();																			// For Alexis
// logBrowserInfo();

// initDeviceDetection();																		// For Alexis

navigate(location.pathname, false);