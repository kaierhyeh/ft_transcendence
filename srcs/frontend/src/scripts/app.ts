import {initMenu} from "./menu/menu.js";
import { initLanguages } from "./i18n/index.js";
import {initTournament} from "./tournament.js";
import initRemoteGame, { cleanupRemoteGame } from "./remoteGame.js";
import {initHistory} from "./history.js";
import { i18n } from "./i18n/index.js";
import { addBrowserClass, logBrowserInfo } from "./utils/browserDetect.js";
import { initDeviceDetection } from "./utils/deviceDetect.js";
import {loadHeader} from "./header.js";
import { initSignup } from "./auth/signup.js";
import { initLogin, handleOAuthCallback } from "./auth/login.js";
import { initSettings } from "./user/settings.js";
import { initPong } from "./pong.js";
import { initProfile } from "./user/profile.js";

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
	},
	"/signup": () => {
		if (typeof initSignup === "function")
			initSignup();
	},
	"/login": () => {
		if (typeof initLogin === "function")
			initLogin();
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
	}
}

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
	app.querySelectorAll("[data-route]").forEach(btn => {
		const element = btn as HTMLElement;
		if (element.id === 'one-player-btn' || element.id === 'two-players-btn' || element.id == 'four-players-btn') return;
		
		btn.addEventListener("click", (e) => {
			e.preventDefault();
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

	const file = routes[path];

	if (file)
	{
		try {
			if (path === '/login' && push) {
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
				history.pushState({path}, "", path);
			
			await loadHeader();
			update_event();
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

addBrowserClass();
logBrowserInfo();

initDeviceDetection();

navigate(location.pathname, false);