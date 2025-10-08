// imports
import { clearEvents, hideElementById, setMenuTitle, showElementById } from "./menu.utils.js";
import { user } from "./users.js";

// data structures

export interface UserListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	user_status: string;
	friendship_status: string | null;
}

/* ============================================ GLOBALS ===================================== */

let API_USERS_ENDPOINT: string;
let menuBackButton: HTMLElement;
// sections
let menuControlPanel: HTMLElement;
let usersSectionButton: HTMLElement;
let friendsSectionButton: HTMLElement;
let chatsSectionButton: HTMLElement;
// users section
let usersSection: HTMLElement;
let usersList: HTMLElement;
let usersInfo: HTMLElement;
// user info panel buttons
let userLowerPanel: HTMLElement;
let firstLine: HTMLElement;
let sendFriendRequestButton: HTMLElement;
let cancelFriendRequestButton: HTMLElement;
let acceptFriendRequestButton: HTMLElement;
let declineFriendRequestButton: HTMLElement;
let removeFriendButton: HTMLElement;
let unblockUserButton: HTMLElement;
let secondLine: HTMLElement;
let openChatButton: HTMLElement;
let blockUserButton: HTMLElement;

let thisUserId: number;

function initializeGlobals(userId: number): boolean {
	API_USERS_ENDPOINT = `${window.location.origin}/api/friends`;
	menuBackButton = document.getElementById("menuBackButton")!;
	// sections
	menuControlPanel = document.getElementById("menuControlPanel")!;
	usersSectionButton = document.getElementById("usersSectionButton")!;
	friendsSectionButton = document.getElementById("friendsSectionButton")!;
	chatsSectionButton = document.getElementById("chatsSectionButton")!;
	// users section
	usersSection = document.getElementById("usersSection")!;
	usersList = document.getElementById("usersList")!;
	usersInfo = document.getElementById("usersInfo")!;
	// user info panel buttons
	userLowerPanel = document.getElementById("userLowerPanel")!;
	firstLine = document.getElementById("firstLine")!;
	sendFriendRequestButton = document.getElementById("sendFriendRequestButton")!;
	cancelFriendRequestButton = document.getElementById("cancelFriendRequestButton")!;
	acceptFriendRequestButton = document.getElementById("acceptFriendRequestButton")!;
	declineFriendRequestButton = document.getElementById("declineFriendRequestButton")!;
	removeFriendButton = document.getElementById("removeFriendButton")!;
	unblockUserButton = document.getElementById("unblockUserButton")!;
	secondLine = document.getElementById("secondLine")!;
	openChatButton = document.getElementById("openChatButton")!;
	blockUserButton = document.getElementById("blockUserButton")!;

	thisUserId = userId;

	if (
		!API_USERS_ENDPOINT ||
		!menuBackButton ||
		!menuControlPanel ||
		!usersSectionButton ||
		!friendsSectionButton ||
		!chatsSectionButton ||
		!usersSection ||
		!usersList ||
		!usersInfo ||
		!userLowerPanel ||
		!firstLine ||
		!sendFriendRequestButton ||
		!cancelFriendRequestButton ||
		!acceptFriendRequestButton ||
		!declineFriendRequestButton ||
		!removeFriendButton ||
		!unblockUserButton ||
		!secondLine ||
		!openChatButton ||
		!blockUserButton
	) {
		return false;
	}

	return true;
}

/* ============================================ UTILS ======================================= */
// utility functions

function clearBeforeOpenUsersSection(): void {
	clearEvents("#usersSection");
	clearEvents("#menuBackButton");
	if (!initializeGlobals(thisUserId)) {
		console.error("USERS: globals reinitialization failed: Missing elements");
	}
}

function resetUsersSection(): void {
	// hideElementById("usersSection");
	hideElementById("friendsSection");
	hideElementById("chatsSection");

	hideElementById("menuBackButton");
	hideElementById("usersInfo");
	hideElementById("userLowerPanel");

	showElementById("menuControlPanel");
	showElementById("usersSectionButton");
	showElementById("friendsSectionButton");
	showElementById("chatsSectionButton");

	setMenuTitle("Users");
}

/* ========================================= USERS SECTION ================================== */
// users section events

// users section init

function renderUserList(users: UserListRow[]): void {

	showElementById("usersList");

	if (users.length === 0) {
		// showElementById("noUsers");
		usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text">No users</h1>`;
		hideElementById("userrsList");
		return;
	}

	users.map(user => {
		console.log(`USER: user: [${user.user_id}] [${user.username}], aka:[${user.alias}], avatar:[${user.avatar_filename}], online:[${user.user_status}], friendship:[${user.friendship_status}]`);
	});

	usersList.innerHTML = users.map(user => {
		const avatarSrc = user.avatar_filename 
			? `/uploads/avatars/${user.avatar_filename}` 
			: '/images/image.png';

		const userName = user.alias
			? `${user.alias} (${user.username})`
			: user.username;

  		// Only show user_status if friendship exists
		const statusHtml = user.friendship_status 
			? `<span class="user-status-${user.user_status.toLowerCase()}">${user.user_status}</span>`
			: `<span class="user-status-unknown"></span>`;

		return `
			<div userListUserId="${user.user_id}" class="user-list-element">
				<img class="user-info-avatar-small" src="${avatarSrc}">
				<div class="user-list-element-info">
					<span>${userName}</span>
					${statusHtml}
				</div>
			</div>
		`;
	}).join("");

	document.querySelectorAll(".user-list-element").forEach(user => {
		user.addEventListener("click", () => {
			console.log(`User clicked in user list user with id: ${user.getAttribute("userListUserId")}`);
		});
	});

}

async function loadUsers(): Promise<void>{
	try {
		const res = await fetch(`${API_USERS_ENDPOINT}/allusers`);
		if (!res.ok) {
			throw new Error(`Failed to fetch users for menu`);
		}
		const users: UserListRow[] = await res.json();
		renderUserList(users);
	} catch (err) {
		console.error("Error loading users:", err);
	}
}

async function initUsersSection(): Promise<void> {
	clearBeforeOpenUsersSection();
	resetUsersSection();
	showElementById("usersList");
	showElementById("usersSection");
	await loadUsers();
}

/* ========================================= INITIALIZATION SECTION ========================= */

export async function openUsersSection(userId: number): Promise<void> {
	console.log("USERS: Users Section opened");
	initializeGlobals(userId);
	if (!menuBackButton || !menuControlPanel || !usersSectionButton || !friendsSectionButton || !chatsSectionButton
		|| !usersSection || !usersList || !usersInfo || !userLowerPanel || !firstLine || !sendFriendRequestButton
		|| !cancelFriendRequestButton || !acceptFriendRequestButton || !declineFriendRequestButton
		|| !removeFriendButton || !unblockUserButton || !secondLine || !openChatButton || !blockUserButton) {
		console.error("One or more required elements not found, cannot open Users section");
		return;
	}
	
	await initUsersSection();
}
