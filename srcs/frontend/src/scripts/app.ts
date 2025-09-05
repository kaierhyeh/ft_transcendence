import {initGame} from "./game.js";
import {initStats} from "./stats.js";

const app = document.getElementById("app") as HTMLElement;

const error_404_path = "404.html";
const routes: Record<string, string> = {
	"/": "./html/home.html",
	"/pong": "./html/pong.html",
	"/stats": "./html/stats.html",
	"/tournament": "./html/tournament.html",
	"/profile": "./html/profile.html"
};

const initScripts: Record<string, () => void> = {
	"/pong": () => {
		if (typeof initGame === "function")
			initGame();
	},
	"/stats": () => {
		if (typeof initStats === "function")
			initStats();
	}
}

async function load404(push: boolean)
{
	const res = await fetch(error_404_path);
	app.innerHTML = await res.text();
	if (push)
		history.pushState({path: "404"}, "", "/404");
	update_event();
}

function update_event()
{
	app.querySelectorAll("[data-route]").forEach(btn => {
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
				throw new Error("File not found");
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

window.onpopstate = (e) => {
	const path = e.state?.path || location.pathname;
	navigate(path, false);
};

navigate(location.pathname, false);