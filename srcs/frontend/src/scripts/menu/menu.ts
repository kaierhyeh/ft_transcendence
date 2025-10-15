import {openChatsSection} from "./menu.chat.js";
import { clearEvents, hideElementById, setElementActive, showElementById } from "./menu.utils.js";
import {openUsersSection} from "./menu.users.js";
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
	console.log("MENU: button open Menu pressed");
	clearEventsInSections();
	hideSectionsElements();
	showElementById("menuWindow");
	hideElementById("menuButton");

	// Initialize language switcher when menu opens
	// initializeLanguageSwitcher();

	openUsers();
}

function closeMenuWindow(): void {
	console.log("MENU: button close	Menu pressed");
	clearEventsInSections();
	hideSectionsElements();
	hideElementById("menuWindow");
	showElementById("menuButton");
}

function openUsers(): void {
	console.log("MENU: button Users pressed");

	clearEventsInSections();
	hideSectionsElements();

	setElementActive("usersSectionButton", true);
	setElementActive("chatsSectionButton", false);

	clearEvents("#menuControlPanel");
	document.getElementById("chatsSectionButton")!.addEventListener("click", openChats);

	openUsersSection(/* 1 */);
}

function openChats(): void {
	console.log("MENU: button Chats pressed");
	clearEventsInSections();
	hideSectionsElements();

	setElementActive("usersSectionButton", false);
	setElementActive("chatsSectionButton", true);

	clearEvents("#menuControlPanel");
	document.getElementById("usersSectionButton")!.addEventListener("click", openUsers);

	openChatsSection(/* 1 */); // Replace 1 with actual current user ID
}

/* ============================================ UTILS ======================================= */

// Clear events in all sections
function clearEventsInSections(): void {
	// clearEvents("#usersSection");
	clearEvents("#usersList");
	clearEvents("#usersInfo");
	clearEvents('#userLowerPanel');
	// clearEvents("#friendsSection");
	// clearEvents("#chatsSection");
	clearEvents("#chatsList");
	clearEvents("#chatMessages");
	clearEvents("#chatLowerPanel");
	// Common elements
	clearEvents("#menuBackButton");
	if(!initializeGlobals()) {
		console.error("MENU: globals reinitialization failed: Missing elements");
	}
	document.getElementById("usersList")!.innerHTML = '<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noUsers">No users</h1>';
	document.getElementById("chatsList")!.innerHTML = '<h1 id="noChats" class="menu-empty-list-text" data-i18n="noChats">No chats</h1>';
}

// To hide elements that are not part of the menu
// This is to prevent mix of elements from different sections
function hideSectionsElements(): void {
	// Hide all in users section
	// hideElementById("usersSection");
	hideElementById("usersList");
	hideElementById("usersInfo");
	hideElementById("userLowerPanel");

	// Hide all in friends section
	// hideElementById("friendsSection");

	// Hide all in chats section
	// hideElementById("chatsSection");
	hideElementById("chatsList");
	hideElementById("chatMessages");
	hideElementById("chatLowerPanel");
	
	// Common elements
	hideElementById("menuBackButton");

	// Show menu control panel if was hidden
	showElementById("menuControlPanel");
}


/* ========================================= INITIALIZATION ================================= */

// Menu initialization function
export async function initMenu(): Promise<void> {

	if (!initializeGlobals()) {
		console.error("Menu initialization failed: Missing elements");
		return;
	}

	// set events to open Menu, Users, Chats, close Menu
	menuButton.addEventListener("click", openMenuWindow);
	menuCloseButton.addEventListener("click", closeMenuWindow);
	usersButton.addEventListener("click", openUsers);
	chatsButton.addEventListener("click", openChats);
}
