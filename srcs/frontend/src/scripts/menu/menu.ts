import { openChatsSection, cleanupChatPresenceSubscription } from "./menu.chat.js";
import { openUsersSection, cleanupUsersPresenceSubscription } from "./menu.users.js";
import user from '../user/User.js';
import { clearEvents, hideElementById, setElementActive, setHeaderTitle, showElementById } from "./menu.utils.js";
import { chatSocket } from "./menu.ws.js";

/* ============================================ GLOBALS ===================================== */

let menuWindow: HTMLElement;
let menuCloseButton: HTMLElement;
let menuButton: HTMLElement;
let usersButton: HTMLElement;
let chatsButton: HTMLElement;

const MENU_MIN_HEIGHT = 490;

function initializeGlobals(): boolean {
	menuCloseButton = document.getElementById("menuCloseButton")!;
	menuButton = document.getElementById("menuButton")!;
	usersButton = document.getElementById("usersSectionButton")!;
	chatsButton = document.getElementById("chatsSectionButton")!;
	menuWindow = document.getElementById('menuWindow')!;
	if (!menuCloseButton || !menuButton || !usersButton || !chatsButton) {
		return false;
	}
	return true;
}

/* ============================================ EVENTS ====================================== */

function openMenuWindow(): void {
	clearEventsInSections();
	hideSectionsElements();
	["menuButton"].forEach(hideElementById);
	["menuWindow"].forEach(showElementById);
	openUsers();
}

export function closeMenuWindow(): void {
	chatSocket?.close(1000, "Close socket: close social menu");
	cleanupChatPresenceSubscription();
	cleanupUsersPresenceSubscription();
	clearEventsInSections();
	hideSectionsElements();
	["menuWindow"].forEach(hideElementById);
	["menuButton"].forEach(showElementById);
}

function openUsers(): void {
	clearEventsInSections();
	hideSectionsElements();
	if (user.isLoggedIn()) {
		setElementActive("usersSectionButton", true);
		setElementActive("chatsSectionButton", false);
		["#menuControlPanel"].forEach(clearEvents);
		document.getElementById("chatsSectionButton")!.addEventListener("click", openChats);
		openUsersSection();
	} else {
		["#menuControlPanel"].forEach(clearEvents);
		openUsersSection();
	}
}

export function openChats(): void {
	if (!user.isLoggedIn()) {
		return;
	}
	clearEventsInSections();
	hideSectionsElements();
	setElementActive("usersSectionButton", false);
	setElementActive("chatsSectionButton", true);
	["#menuControlPanel"].forEach(clearEvents);
	document.getElementById("usersSectionButton")!.addEventListener("click", openUsers);
	openChatsSection();
}

/* ============================================ UTILS ======================================= */

// Clear events in all sections
function clearEventsInSections(): void {
	[	"#usersList",
		"#usersInfo",
		'#userLowerPanel',
		"#chatsList",
		"#chatMessages",
		"#chatLowerPanel",
		"#menuBackButton"
	].forEach(clearEvents);

	if(!initializeGlobals()) {
		console.error("MENU: globals reinitialization failed: Missing elements");
	}

	document.getElementById("usersList")!.innerHTML = '';
	document.getElementById("chatsList")!.innerHTML = '';
	setHeaderTitle("allUsers");
}

// To hide elements that are not part of the menu
// This is to prevent mix of elements from different sections
function hideSectionsElements(): void {
	[	"usersList",
		"usersInfo",
		"userLowerPanel",
		"chatsList",
		"chatMessages",
		"chatLowerPanel",
		"menuBackButton"
	].forEach(hideElementById);

	if (user.isLoggedIn()) {
		["menuControlPanel"].forEach(showElementById);
	} else {
		["menuControlPanel"].forEach(hideElementById);
	}

}

/* ========================================= INITIALIZATION ================================= */

// Menu initialization function
export async function initMenu(): Promise<void> {

	if (!initializeGlobals()) {
		console.error("Menu initialization failed: Missing elements");
		return;
	}

	chatSocket?.close(1000, "Initialize social menu");

	menuButton.addEventListener("click", openMenuWindow);
	menuCloseButton.addEventListener("click", closeMenuWindow);
	usersButton.addEventListener("click", openUsers);
	chatsButton.addEventListener("click", openChats);

	const handleResize = () => {
		try {
			if (window.innerHeight < MENU_MIN_HEIGHT) {
				if (menuWindow && !menuWindow.classList.contains('hidden'))
					closeMenuWindow();
			}
		}
		catch (err) {
			console.error('menu resize handler error', err);
		}
	}

	handleResize();
	window.addEventListener('resize', handleResize);
}
