import {initGame} from "./game.js";
import {initGame4p} from "./game4p.js";
import {initStats} from "./stats.js";
import {initProfile, handleOAuthCallback} from "./profile.js";
import {initTournament} from "./tournament.js";

const app = document.getElementById("app") as HTMLElement;

const error_404_path = "./html/404.html";
const routes: Record<string, string> = {
	"/": "./html/home.html",
	"/pong": "./html/pong.html",
	"/pong/four-players": "./html/pong.html",
	"/pong/online": "./html/pong.html", //temporary
	"/stats": "./html/stats.html",
	"/tournament": "./html/tournament.html",
	"/profile": "./html/profile.html",
	"/oauth-callback": "./html/profile.html"
};

const initScripts: Record<string, () => void> = {
	"/pong": () => {
		if (typeof initGame === "function")
			initGame();
	},
	"/pong/four-players": () => {
		if (typeof initGame4p === "function")
			initGame4p();
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
	"/oauth-callback": () => {
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
	update_event();
}

function update_event()
{
	app.querySelectorAll("[data-route]").forEach(btn => {
		const element = btn as HTMLElement;
		if (element.id === 'one-player-btn' || element.id === 'two-players-btn') return;
		
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			const path = (e.currentTarget as HTMLElement).dataset.route!;
			navigate(path);
		});
	});
}

async function navigate(path: string, push: boolean = true)
{
	const file = routes[path];

	if (file)
	{
		try {
			const res = await fetch(file);
			if (!res.ok)
				throw new Error("File not found.");
			app.innerHTML = await res.text();
			if (push)
				history.pushState({path}, "", path);
			update_event();
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

(window as any).navigate = navigate;

window.onpopstate = (e) => {
	const path = e.state?.path || location.pathname;
	navigate(path, false);
};

navigate(location.pathname, false);