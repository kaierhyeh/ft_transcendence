import {openChatsSection} from "./menu.chat.js";
// import {openUsersSection} from "./menu.users.js";
// import {openFriendsSection} from "./menu.friends.js";


// for tests
function openUsersSection(): void {
	console.log("MENU: Users Section opened (test function)");
}

function openFriendsSection(): void {
	console.log("MENU: Friends Section opened (test function)");
}

/* ============================================ EVENTS ====================================== */

// Need to set and unset ACTIV class to buttons when clicked o use CSS for active button

function openMenuWindow(): void {
	// run users section as default
	console.log("MENU: button open Menu pressed");
	clearEventsInSections();
	hideSectionsElements();
	showElementById("menuWindow");
	hideElementById("menuOpenButton");
	openUsers();
}

function closeMenuWindow(): void {
	console.log("MENU: button close	Menu pressed");
	clearEventsInSections();
	hideSectionsElements();
	hideElementById("menuWindow");
	showElementById("menuOpenButton");
}

function openUsers(): void {
	console.log("MENU: button Users pressed");
	clearEventsInSections();
	hideSectionsElements();
	openUsersSection();
}

function openFriends(): void {
	console.log("MENU: button Friends pressed");
	clearEventsInSections();
	hideSectionsElements();
	openFriendsSection();
}

function openChats(): void {
	console.log("MENU: button Chats pressed");
	clearEventsInSections();
	hideSectionsElements();
	openChatsSection(1); // Replace 1 with actual current user ID
}

/* ============================================ UTILS ======================================= */

// To remove all event listeners from an element and its children
function clearEvents(toReset: string): void {
	// Clear all event listeners for Friends, Users, Chats
	const oldElement = document.querySelector(toReset);
	if (!oldElement) { return; }
	const newElement = oldElement.cloneNode(true);
	oldElement.replaceWith(newElement);
}

// Clear events in all sections
function clearEventsInSections(): void {
	clearEvents("#usersSection");
	clearEvents("#friendsSection");
	clearEvents("#chatsSection");
	clearEvents("#menuBackButton");
}

function hideElementById(id: string): void {
	const element = document.getElementById(id);
	if (element) {
		element.classList.add("hidden");
	}
}

function showElementById(id: string): void {
	const element = document.getElementById(id);
	if (element) {
		element.classList.remove("hidden");
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
	hideElementById("chat-user-list");
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
	// set all documents document.getElementById("ID") to variables
	// check if they are not null
	const menuWindow = document.getElementById("menuWindow");
	const menuCloseButton = document.getElementById("menuCloseButton");
	const menuButton = document.getElementById("menuButton");
	const usersButton = document.getElementById("usersSectionButton");
	const friendsButton = document.getElementById("friendsSectionButton");
	const chatsButton = document.getElementById("chatsSectionButton");

	if (!menuWindow || !menuCloseButton || !menuButton || !usersButton || !friendsButton || !chatsButton) {
		console.error("Menu initialization failed: Missing elements");
		// function to fix missing elements or reload html file?
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
