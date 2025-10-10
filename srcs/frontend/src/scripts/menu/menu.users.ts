// imports
// import { send } from "../api.js";
import { clearEvents, hideElementById, setMenuTitle, showElementById } from "./menu.utils.js";
// import { user } from "../users.js";

// data structures

export interface UserListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	user_status: string;
	friendship_status: string | null;
}

export interface UserInfo {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	user_status: string;
	friendship_status: string | null;
	from_id: number | null;
	to_id: number | null;
}

/* ============================================ GLOBALS ===================================== */

let API_USERS_FRIENDS: string;
let API_USERS_BLOCKS: string;
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
	API_USERS_FRIENDS = `${window.location.origin}/api/friends`;
	API_USERS_BLOCKS = `${window.location.origin}/api/blocks`;
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
		!API_USERS_FRIENDS ||
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
	menuBackButton.addEventListener("click", () => {
		console.log("USERS: Back button clicked");
		initUsersSection();
	});
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

function resetUserinfoButtons(): void {
	clearEvents("#firstLine");
	clearEvents("#secondLine");

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

}

/* ========================================= USER INFO SECTION ============================== */

// events for user info section

async function sendFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Sending friend request to user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_FRIENDS}/request/${userInfo.user_id}`, {
			method: 'POST',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: sendFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function cancelFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Cancelling friend request to user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_FRIENDS}/request/${userInfo.user_id}`, {
			method: 'DELETE',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: cancelFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function acceptFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Accepting friend request from user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_FRIENDS}/accept/${userInfo.user_id}`, {
			method: 'POST',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: acceptFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function declineFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Declining friend request from user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_FRIENDS}/decline/${userInfo.user_id}`, {
			method: 'DELETE',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: declineFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function removeFriend(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Removing friend user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_FRIENDS}/${userInfo.user_id}`, {
			method: 'DELETE',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: removeFriend failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function openChatWithUser(userInfo: UserInfo): Promise<void> {
	console.log(`USERS: Opening chat with user id: ${userInfo.user_id}`);
}

async function blockUser(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Blocking user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_BLOCKS}/${userInfo.user_id}`, {
			method: 'POST',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: blockUser failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function unblockUser(userInfo: UserInfo): Promise<void> {
	try {
		console.log(`USERS: Unblocking user id: ${userInfo.user_id}`);
		await fetch(`${API_USERS_BLOCKS}/${userInfo.user_id}`, {
			method: 'DELETE',
			headers: {
				// Authorization: Bearer <user-session-jwt>
			}
		});
	} catch (err) {
		console.error("USERS: unblockUser failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

// user info section

function prepareUserInfoSection(): void {
	hideElementById("usersList");
	hideElementById("menuControlPanel");
	setMenuTitle(`User info`);
	showElementById("menuBackButton");
	showElementById("usersInfo");
	showElementById("userLowerPanel");
	showElementById("firstLine");
	showElementById("secondLine");
}

function updateButtonsForUserInfo(userInfo: UserInfo): void {
	resetUserinfoButtons();
	switch (userInfo.friendship_status) {
		// No friendship exists
		case null:
			showElementById("firstLine");
			showElementById("sendFriendRequestButton");
			hideElementById("cancelFriendRequestButton");
			hideElementById("acceptFriendRequestButton");
			hideElementById("declineFriendRequestButton");
			hideElementById("removeFriendButton");
			hideElementById("unblockUserButton");
			showElementById("secondLine");
			showElementById("openChatButton");
			showElementById("blockUserButton");
			sendFriendRequestButton.addEventListener("click", () => sendFriendRequest(userInfo));
			openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			blockUserButton.addEventListener("click", () => blockUser(userInfo));
			break;
		case 'pending':
			if (userInfo.user_id === userInfo.to_id) {
				// thisUser sent friend request to target user (cancel request)
				showElementById("firstLine");
				hideElementById("sendFriendRequestButton");
				showElementById("cancelFriendRequestButton");
				hideElementById("acceptFriendRequestButton");
				hideElementById("declineFriendRequestButton");
				hideElementById("removeFriendButton");
				hideElementById("unblockUserButton");
				showElementById("secondLine");
				showElementById("openChatButton");
				showElementById("blockUserButton");
				cancelFriendRequestButton.addEventListener("click", () => cancelFriendRequest(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
				blockUserButton.addEventListener("click", () => blockUser(userInfo));
			} else {
				// target user sent friend request to thisUser (accept/decline request)
				showElementById("firstLine");
				hideElementById("sendFriendRequestButton");
				hideElementById("cancelFriendRequestButton");
				showElementById("acceptFriendRequestButton");
				showElementById("declineFriendRequestButton");
				hideElementById("removeFriendButton");
				hideElementById("unblockUserButton");
				showElementById("secondLine");
				showElementById("openChatButton");
				showElementById("blockUserButton");
				acceptFriendRequestButton.addEventListener("click", () => acceptFriendRequest(userInfo));
				declineFriendRequestButton.addEventListener("click", () => declineFriendRequest(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
				blockUserButton.addEventListener("click", () => blockUser(userInfo));
			}
			break;
		case 'accepted':
			showElementById("firstLine");
			hideElementById("sendFriendRequestButton");
			hideElementById("cancelFriendRequestButton");
			hideElementById("acceptFriendRequestButton");
			hideElementById("declineFriendRequestButton");
			showElementById("removeFriendButton");
			hideElementById("unblockUserButton");
			showElementById("secondLine");
			showElementById("openChatButton");
			showElementById("blockUserButton");
			removeFriendButton.addEventListener("click", () => removeFriend(userInfo));
			openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			blockUserButton.addEventListener("click", () => blockUser(userInfo));
			break;
		case 'blocked':
			if (userInfo.user_id === userInfo.to_id) {
				// thisUser blocked target user (unblock)
				showElementById("firstLine");
				hideElementById("sendFriendRequestButton");
				hideElementById("cancelFriendRequestButton");
				hideElementById("acceptFriendRequestButton");
				hideElementById("declineFriendRequestButton");
				hideElementById("removeFriendButton");
				showElementById("unblockUserButton");
				showElementById("secondLine");
				showElementById("openChatButton");
				hideElementById("blockUserButton");
				unblockUserButton.addEventListener("click", () => unblockUser(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			} else {
				// target user blocked thisUser (no actions)
				hideElementById("firstLine");
				hideElementById("sendFriendRequestButton");
				hideElementById("cancelFriendRequestButton");
				hideElementById("acceptFriendRequestButton");
				hideElementById("declineFriendRequestButton");
				hideElementById("removeFriendButton");
				hideElementById("unblockUserButton");
				showElementById("secondLine");
				showElementById("openChatButton");
				hideElementById("blockUserButton");
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			}
			break;
	}

}

function renderUserInfo(userInfo: UserInfo): void {
	prepareUserInfoSection();
	console.log(`USER INFO: rendering user info for user: [${userInfo.user_id}] [${userInfo.username}], aka:[${userInfo.alias}], avatar:[${userInfo.avatar_filename}], online:[${userInfo.user_status}], friendship:[${userInfo.friendship_status}]`);

	const avatarSrc = `https://localhost:4443/api/users/profile/id/${userInfo.user_id}/avatar`;

	const userAlias = userInfo.alias
		? `<div id="userAlias" class="user-info-alias">aka ${userInfo.alias}</div>`
		: '';

	const statusHtml = (userInfo.friendship_status === 'accepted')
		? `<div id="userOnlineStatus" class="user-info-online-status">
				Status: <span class="user-status-${userInfo.user_status.toLowerCase()}">${userInfo.user_status}</span>
			</div>`
		: '';

	usersInfo.innerHTML = `
		<img id="selectedUserAvatar" class="user-info-avatar" src="${avatarSrc}">
		<div id="userName" class="user-info-username">${userInfo.username}</div>
		${userAlias}
		${statusHtml}
		<div id="userStats" class="user-info-stats">
			<span class="user-info-wins">W: ?</span>
			<span> | </span>
			<span class="user-info-losses">L: ?</span>
		</div>
	`;
	updateButtonsForUserInfo(userInfo);
}

async function initUserInfoSection(targetUserId: number): Promise<void> {
	try {
		console.log(`USER INFO: loading user info for target user id: ${targetUserId}`);
		const res = await fetch(`${API_USERS_FRIENDS}/${targetUserId}`);
		if (!res.ok) {
			throw new Error(`Failed to fetch user info for user id: ${targetUserId}`);
		}
		const userInfo: UserInfo = await res.json();
		if (!userInfo) {
			console.error(`USER INFO: No user data received for user id: ${targetUserId}`);
			initUsersSection();
		} else {
			console.log(`USER INFO: user data received:`, userInfo);
			renderUserInfo(userInfo);
		}

	} catch (err) {
		console.error("Error loading user info:", err);
	}

}

/* ========================================= USERS SECTION ================================== */

function renderUserList(users: UserListRow[]): void {

	showElementById("usersList");

	if (users.length === 0) {
		// showElementById("noUsers");
		usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text">No users</h1>`;
		hideElementById("userrsList");
		return;
	}

	users.map(u => {
		console.log(`USER: user: [${u.user_id}] [${u.username}], aka:[${u.alias}], avatar:[${u.avatar_filename}], online:[${u.user_status}], friendship:[${u.friendship_status}]`);
	});

	usersList.innerHTML = users.map(u => {
		const avatarSrc = `https://localhost:4443/api/users/profile/id/${u.user_id}/avatar`;

		const userName = u.alias
			? `${u.username} aka ${u.alias}`
			: u.username;

  		// Only show user_status if friendship exists
		const statusHtml = u.friendship_status
			? `<span class="user-status-${u.user_status.toLowerCase()}">${u.user_status}</span>`
			: `<span class="user-status-unknown"></span>`;

		return `
			<div class="user-list-element" data-user-id="${u.user_id}">
				<img class="user-info-avatar-small" src="${avatarSrc}">
				<div class="user-list-element-info">
					<span>${userName}</span>
					${statusHtml}
				</div>
			</div>
		`;
	}).join("");

	document.querySelectorAll(".user-list-element").forEach(u => {
		u.addEventListener("click", () => {
			const userId = (u as HTMLElement).dataset.userId;
			console.log(`User TARGET id: ${userId}=`, userId);
			console.log("Full dataset:", (u as HTMLElement).dataset);
			if (userId) {
				initUserInfoSection(parseInt(userId));
			}
		});
	});

}

async function loadUsers(): Promise<void>{
	try {
		const res = await fetch(`${API_USERS_FRIENDS}/allusers`);
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
