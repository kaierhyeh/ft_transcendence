import {openChatsSection} from "./menu.chat.js";
import { clearEvents, hideElementById, setElementActive, showElementById } from "./menu.utils.js";
import {openUsersSection} from "./menu.users.js";
import {openFriendsSection} from "./menu.friends.js";
import { initializeLanguageSwitcher } from "../i18n/index.js";

/* ============================================ GLOBALS ===================================== */

let menuWindow: HTMLElement;
let menuCloseButton: HTMLElement;
let menuButton: HTMLElement;
let usersButton: HTMLElement;
let friendsButton: HTMLElement;
let chatsButton: HTMLElement;

function initializeGlobals(): boolean {
	menuWindow = document.getElementById("menuWindow")!;
	menuCloseButton = document.getElementById("menuCloseButton")!;
	menuButton = document.getElementById("menuButton")!;
	usersButton = document.getElementById("usersSectionButton")!;
	friendsButton = document.getElementById("friendsSectionButton")!;
	chatsButton = document.getElementById("chatsSectionButton")!;
	if (!menuWindow || !menuCloseButton || !menuButton || !usersButton || !friendsButton || !chatsButton) {
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
	initializeLanguageSwitcher();

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
	setElementActive("friendsSectionButton", false);
	setElementActive("chatsSectionButton", false);

	clearEvents("#menuControlPanel");
	document.getElementById("friendsSectionButton")!.addEventListener("click", openFriends);
	document.getElementById("chatsSectionButton")!.addEventListener("click", openChats);

	openUsersSection();
}

function openFriends(): void {
	console.log("MENU: button Friends pressed");
	clearEventsInSections();
	hideSectionsElements();

	setElementActive("usersSectionButton", false);
	setElementActive("friendsSectionButton", true);
	setElementActive("chatsSectionButton", false);

	clearEvents("#menuControlPanel");
	document.getElementById("usersSectionButton")!.addEventListener("click", openUsers);
	document.getElementById("chatsSectionButton")!.addEventListener("click", openChats);

	openFriendsSection();
}

function openChats(): void {
	console.log("MENU: button Chats pressed");
	clearEventsInSections();
	hideSectionsElements();

	setElementActive("usersSectionButton", false);
	setElementActive("friendsSectionButton", false);
	setElementActive("chatsSectionButton", true);

	clearEvents("#menuControlPanel");
	document.getElementById("usersSectionButton")!.addEventListener("click", openUsers);
	document.getElementById("friendsSectionButton")!.addEventListener("click", openFriends);

	openChatsSection(1); // Replace 1 with actual current user ID
}

/* ============================================ UTILS ======================================= */

// Clear events in all sections
function clearEventsInSections(): void {
	clearEvents("#usersSection");
	clearEvents("#friendsSection");
	clearEvents("#chatsSection");
	clearEvents("#menuBackButton");
	if(!initializeGlobals()) {
		console.error("MENU: globals reinitialization failed: Missing elements");
	}
}

// To hide elements that are not part of the menu
// This is to prevent mix of elements from different sections
function hideSectionsElements(): void {
	// Hide all in users section
	hideElementById("usersSection");

	// Hide all in friends section
	hideElementById("friendsSection");

	// Hide all in chats section
	hideElementById("chatsSection");
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

	// set events to open Menu, Users, Friends, Chats, close Menu
	menuButton.addEventListener("click", openMenuWindow);
	menuCloseButton.addEventListener("click", closeMenuWindow);
	usersButton.addEventListener("click", openUsers);
	friendsButton.addEventListener("click", openFriends);
	chatsButton.addEventListener("click", openChats);

	// call Users event (as home page for menu)
	openUsers();
}
