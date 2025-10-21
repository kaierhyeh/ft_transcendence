import {openChatsSection} from "./menu.chat.js";
import {openUsersSection} from "./menu.users.js";
import { clearEvents, hideElementById, setElementActive, showElementById } from "./menu.utils.js";
// import { initializeLanguageSwitcher } from "../i18n/index.js";

/* ============================================ GLOBALS ===================================== */

let menuWindow: HTMLElement;
let menuCloseButton: HTMLElement;
let menuButton: HTMLElement;
let usersButton: HTMLElement;
let chatsButton: HTMLElement;

function initializeGlobals(): boolean {
	menuWindow = document.getElementById("menuWindow")!;
	menuCloseButton = document.getElementById("menuCloseButton")!;
	menuButton = document.getElementById("menuButton")!;
	usersButton = document.getElementById("usersSectionButton")!;
	chatsButton = document.getElementById("chatsSectionButton")!;
	if (!menuWindow || !menuCloseButton || !menuButton || !usersButton || !chatsButton) {
		return false;
	}
	return true;
}

/* ============================================ EVENTS ====================================== */

// Need to set and unset ACTIV class to buttons when clicked o use CSS for active button

function openMenuWindow(): void {
	// run users section as default
	clearEventsInSections();
	hideSectionsElements();
	["menuButton"].forEach(hideElementById);
	["menuWindow"].forEach(showElementById);

	// Initialize language switcher when menu opens
	// initializeLanguageSwitcher();

	openUsers();
}

function closeMenuWindow(): void {
	clearEventsInSections();
	hideSectionsElements();
	["menuWindow"].forEach(hideElementById);
	["menuButton"].forEach(showElementById);
}

function openUsers(): void {
	clearEventsInSections();
	hideSectionsElements();
	setElementActive("usersSectionButton", true);
	setElementActive("chatsSectionButton", false);
	["#menuControlPanel"].forEach(clearEvents);
	document.getElementById("chatsSectionButton")!.addEventListener("click", openChats);
	openUsersSection();
}

function openChats(): void {
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

	["menuControlPanel"].forEach(showElementById)

}


/* ========================================= INITIALIZATION ================================= */

// Menu initialization function
export async function initMenu(): Promise<void> {

	if (!initializeGlobals()) {
		console.error("Menu initialization failed: Missing elements");
		return;
	}

	menuButton.addEventListener("click", openMenuWindow);
	menuCloseButton.addEventListener("click", closeMenuWindow);
	usersButton.addEventListener("click", openUsers);
	chatsButton.addEventListener("click", openChats);

}
