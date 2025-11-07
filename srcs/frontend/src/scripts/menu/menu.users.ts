import { User } from "../user/User.js";
import user from '../user/User.js';
import { clearEvents, hideElementById, setFilterForUsersList, showElementById, setHeaderTitle } from "./menu.utils.js";
import { initMessageSection } from "./menu.chat.js";
import { UserInfo, UserListRow, ChatUser } from "./menu.types.js";
import { openChats } from "./menu.js";
import { presence, OnlineStatus, Presence } from "../presence.js";
import { fetchWithAuth } from "../utils/fetch.js";
import { chatSocket } from "./menu.ws.js";
import { t } from "../i18n/i18n.js";

/* ============================================ GLOBALS ===================================== */

let API_CHAT_ENDPOINT: string;
let API_USERS_FRIENDS: string;
let API_USERS_BLOCKS: string;
let menuBackButton: HTMLElement;

let usersList: HTMLElement;
let usersInfo: HTMLElement;

let sendFriendRequestButton: HTMLElement;
let cancelFriendRequestButton: HTMLElement;
let acceptFriendRequestButton: HTMLElement;
let declineFriendRequestButton: HTMLElement;
let removeFriendButton: HTMLElement;
let unblockUserButton: HTMLElement;
let openChatButton: HTMLElement;
let blockUserButton: HTMLElement;

let currentFilter: string = 'all';
let presenceUnsubscribe: (() => void) | null = null;

function initializeGlobals(): boolean {
	API_CHAT_ENDPOINT = `${window.location.origin}/api/chat`;
	API_USERS_FRIENDS = `${window.location.origin}/api/friends`;
	API_USERS_BLOCKS = `${window.location.origin}/api/blocks`;

	["#menuBackButton"].forEach(clearEvents);
	menuBackButton = document.getElementById("menuBackButton")!;

	usersList = document.getElementById("usersList")!;
	usersInfo = document.getElementById("usersInfo")!;

	sendFriendRequestButton = document.getElementById("sendFriendRequestButton")!;
	cancelFriendRequestButton = document.getElementById("cancelFriendRequestButton")!;
	acceptFriendRequestButton = document.getElementById("acceptFriendRequestButton")!;
	declineFriendRequestButton = document.getElementById("declineFriendRequestButton")!;
	removeFriendButton = document.getElementById("removeFriendButton")!;
	unblockUserButton = document.getElementById("unblockUserButton")!;
	openChatButton = document.getElementById("openChatButton")!;
	blockUserButton = document.getElementById("blockUserButton")!;

	if (
		!API_USERS_FRIENDS ||
		!menuBackButton ||
		!usersList ||
		!usersInfo ||
		!sendFriendRequestButton ||
		!cancelFriendRequestButton ||
		!acceptFriendRequestButton ||
		!declineFriendRequestButton ||
		!removeFriendButton ||
		!unblockUserButton ||
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

	[	"#usersList",
		"#usersInfo",
		"#userLowerPanel",
		"#menuBackButton"
	].forEach(clearEvents);

	if (!initializeGlobals()) {
		console.error("USERS: globals reinitialization failed: Missing elements");
	}

	menuBackButton.addEventListener("click", () => {
		// console.log("USERS: Back button clicked");
		initUsersSection();
	});
}

function resetUsersSection(): void {

	[	"chatsList",
		"chatMessages",
		"chatLowerPanel",
		"menuBackButton",
		"usersInfo",
		"userLowerPanel"
	].forEach(hideElementById);

	if (user.isLoggedIn()) {
		[	"menuControlPanel",
			"usersSectionButton",
			"chatsSectionButton"
		].forEach(showElementById);
	}

}

function resetUserinfoButtons(): void {

	[	"#firstLine",
		"#secondLine"
	].forEach(clearEvents);

	sendFriendRequestButton = document.getElementById("sendFriendRequestButton")!;
	cancelFriendRequestButton = document.getElementById("cancelFriendRequestButton")!;
	acceptFriendRequestButton = document.getElementById("acceptFriendRequestButton")!;
	declineFriendRequestButton = document.getElementById("declineFriendRequestButton")!;
	removeFriendButton = document.getElementById("removeFriendButton")!;
	unblockUserButton = document.getElementById("unblockUserButton")!;
	openChatButton = document.getElementById("openChatButton")!;
	blockUserButton = document.getElementById("blockUserButton")!;

}

/* ========================================= USER INFO SECTION ============================== */

// events for user info section

async function sendFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Sending friend request to user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_FRIENDS}/request/${userInfo.user_id}`, {
			method: 'POST'
		});
	} catch (err) {
		console.error("USERS: sendFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function cancelFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Cancelling friend request to user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_FRIENDS}/request/${userInfo.user_id}`, {
			method: 'DELETE'
		});
	} catch (err) {
		console.error("USERS: cancelFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function acceptFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Accepting friend request from user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_FRIENDS}/accept/${userInfo.user_id}`, {
			method: 'POST'
		});
	} catch (err) {
		console.error("USERS: acceptFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function declineFriendRequest(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Declining friend request from user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_FRIENDS}/decline/${userInfo.user_id}`, {
			method: 'DELETE'
		});
	} catch (err) {
		console.error("USERS: declineFriendRequest failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function removeFriend(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Removing friend user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_FRIENDS}/${userInfo.user_id}`, {
			method: 'DELETE'
		});
	} catch (err) {
		console.error("USERS: removeFriend failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function openChatWithUser(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Opening chat with user id: ${userInfo.user_id}`);
		// chatId: number, withUser: ChatUser, friendshipStatus: string | null
		const res = await fetchWithAuth(`${API_CHAT_ENDPOINT}/open/${userInfo.user_id}`, {
			method: "GET"
		});
		if (!res.ok) {
			if (res.status === 401) {
				user.logout();
				chatSocket?.close(1000, "Close socket: unauthorized user");
				(window as any).navigateTo('/login');
				return;
			}
			throw new Error(`Failed to get raw chat info with user: ${userInfo.user_id}`);
		}
		// console.log("[DEBUG CHAT] - res:", res);
		const chatUser: ChatUser = await res.json();
		if (chatUser === undefined) {
			throw new Error(`Failed to get chat info with user: ${userInfo.user_id}`);
		}
		// console.log("[DEBUG CHAT] - chatUser:", chatUser);

		[	"usersList",
			"usersInfo",
			"userLowerPanel"
		].forEach(hideElementById);

		initMessageSection(chatUser.chat_id, chatUser, chatUser.friendship_status, "users");

	} catch (err) {
		console.error("USERS: blockUser failed", err);
	}

}

async function blockUser(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Blocking user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_BLOCKS}/${userInfo.user_id}`, {
			method: 'POST'
		});
	} catch (err) {
		console.error("USERS: blockUser failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

async function unblockUser(userInfo: UserInfo): Promise<void> {
	try {
		// console.log(`USERS: Unblocking user id: ${userInfo.user_id}`);
		await fetchWithAuth(`${API_USERS_BLOCKS}/${userInfo.user_id}`, {
			method: 'DELETE'
		});
	} catch (err) {
		console.error("USERS: unblockUser failed", err);
	}
	await initUserInfoSection(userInfo.user_id);
}

// user info section

function prepareUserInfoSection(): void {
	setHeaderTitle("userInfo");

	[	"usersList",
		"menuControlPanel",
		"menuDropdown"
	].forEach(hideElementById);

	[	"menuHeaderTitle",
		"menuBackButton",
		"usersInfo"
	].forEach(showElementById);

	if (user.isLoggedIn()) {
		[	"userLowerPanel",
			"firstLine",
			"secondLine"
		].forEach(showElementById);
	}

	usersInfo = document.getElementById("usersInfo")!;

}

function updateButtonsForUserInfo(userInfo: UserInfo): void {
	if (!user.isLoggedIn()) {
		return;
	}

	resetUserinfoButtons();

	switch (userInfo.friendship_status) {
		// No friendship exists
		case null:

			[	"cancelFriendRequestButton",
				"acceptFriendRequestButton",
				"declineFriendRequestButton",
				"removeFriendButton",
				"unblockUserButton"
			].forEach(hideElementById);

			[	"firstLine",
				"sendFriendRequestButton",
				"secondLine",
				"openChatButton",
				"blockUserButton"
			].forEach(showElementById);

			sendFriendRequestButton.addEventListener("click", () => sendFriendRequest(userInfo));
			openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			blockUserButton.addEventListener("click", () => blockUser(userInfo));
			break;
		case 'pending':
			if (userInfo.user_id === userInfo.to_id) {
				// thisUser sent friend request to target user (cancel request)

				[	"sendFriendRequestButton",
					"acceptFriendRequestButton",
					"declineFriendRequestButton",
					"removeFriendButton",
					"unblockUserButton"
				].forEach(hideElementById);

				[	"firstLine",
					"cancelFriendRequestButton",
					"secondLine",
					"openChatButton",
					"blockUserButton"
				].forEach(showElementById);

				cancelFriendRequestButton.addEventListener("click", () => cancelFriendRequest(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
				blockUserButton.addEventListener("click", () => blockUser(userInfo));
			} else {
				// target user sent friend request to thisUser (accept/decline request)

				[	"sendFriendRequestButton",
					"cancelFriendRequestButton",
					"removeFriendButton",
					"unblockUserButton"
				].forEach(hideElementById);

				[	"firstLine",
					"acceptFriendRequestButton",
					"declineFriendRequestButton",
					"secondLine",
					"openChatButton",
					"blockUserButton"
				].forEach(showElementById);

				acceptFriendRequestButton.addEventListener("click", () => acceptFriendRequest(userInfo));
				declineFriendRequestButton.addEventListener("click", () => declineFriendRequest(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
				blockUserButton.addEventListener("click", () => blockUser(userInfo));
			}
			break;
		case 'accepted':

			[	"sendFriendRequestButton",
				"cancelFriendRequestButton",
				"acceptFriendRequestButton",
				"declineFriendRequestButton",
				"unblockUserButton"
			].forEach(hideElementById);

			[	"firstLine",
				"removeFriendButton",
				"secondLine",
				"openChatButton",
				"blockUserButton"
			].forEach(showElementById);

			removeFriendButton.addEventListener("click", () => removeFriend(userInfo));
			openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			blockUserButton.addEventListener("click", () => blockUser(userInfo));
			break;
		case 'blocked':
			if (userInfo.user_id === userInfo.to_id) {
				// thisUser blocked target user (unblock)

				[	"sendFriendRequestButton",
					"cancelFriendRequestButton",
					"acceptFriendRequestButton",
					"declineFriendRequestButton",
					"removeFriendButton",
					"blockUserButton"
				].forEach(hideElementById);

				[	"firstLine",
					"unblockUserButton",
					"secondLine",
					"openChatButton"
				].forEach(showElementById);

				unblockUserButton.addEventListener("click", () => unblockUser(userInfo));
				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			} else {
				// target user blocked thisUser (no actions)

				[	"firstLine",
					"sendFriendRequestButton",
					"cancelFriendRequestButton",
					"acceptFriendRequestButton",
					"declineFriendRequestButton",
					"removeFriendButton",
					"unblockUserButton",
					"blockUserButton"
				].forEach(hideElementById);

				[	"secondLine",
					"openChatButton"
				].forEach(showElementById);

				openChatButton.addEventListener("click", () => openChatWithUser(userInfo));
			}
			break;
	}

}

function renderUserInfo(userInfo: UserInfo): void {
	prepareUserInfoSection();
	// console.log(`USER INFO: rendering user info for user: [${userInfo.user_id}] [${userInfo.username}], aka:[${userInfo.alias}], avatar:[${userInfo.avatar_filename}], online:[${userInfo.user_status}], friendship:[${userInfo.friendship_status}]`);

	// const avatarSrc = `${window.location.origin}/api/users/${userInfo.user_id}/avatar`;
	const avatarSrc = User.getAvatarUrl(userInfo.user_id, userInfo.avatar_updated_at);

	const userInfo_userAlias = userInfo.alias
		? `<div id="userInfo_boxAlias" class="user-info-alias">aka ${userInfo.alias}</div>`
		: '';

	const userOnlineStatus = presence.onlineStatus(userInfo.user_id);
	const statusHtml = (userInfo.friendship_status === 'accepted')
		? `<div id="userInfo_boxOnline" class="user-info-online-status">
				<span class="user-status-${userOnlineStatus.toLowerCase()}">${Presence.display(userOnlineStatus)}</span>
			</div>`
		: `<div id="userInfo_boxOnline" class="user-info-online-status">
				<span></span>
			</div>`;

	usersInfo.innerHTML = `
		<div id="userInfo_boxAvatar" class="user-info-avatar-box">
			<img id="userInfo_avatar" class="user-info-avatar" src="${avatarSrc}">
		</div>
		<div id="userInfo_boxUsername" class="user-info-username">${userInfo.username}</div>
		${userInfo_userAlias}
		${statusHtml}
		<div id="userInfo_boxSatatsBtn" class="user-info-stats-btn-box">
			<button id="viewProfileButton" class="user-info-profile-btn" data-i18n="userDetails">${t("userDetails")}</button>
		</div>
	`;
	
	// Add user_id as data attribute for easy access
	usersInfo.dataset.userId = userInfo.user_id.toString();

	const viewProfileBtn = document.getElementById('viewProfileButton');
	if (viewProfileBtn) {
		viewProfileBtn.addEventListener('click', (e) => {
			e.preventDefault();
			if ((window as any).navigateTo) {
				(window as any).navigateTo(`/user/profile?id=${userInfo.user_id}`);
			}
		});
	}
	updateButtonsForUserInfo(userInfo);
}

async function initUserInfoSection(targetUserId: number): Promise<void> {
	try {
		// console.log(`USER INFO: loading user info for target user id: ${targetUserId}`);
		const res = await fetchWithAuth(`${API_USERS_FRIENDS}/${targetUserId}`, {
			method: 'GET'
		});
		if (!res.ok) {
			if (res.status === 401) {
				user.logout();
				chatSocket?.close(1000, "Close socket: unauthorized user");
				(window as any).navigateTo('/login');
				return;
			}
			throw new Error(`Failed to fetch user info for user id: ${targetUserId}`);
		}
		const userInfo: UserInfo = await res.json();
		if (!userInfo) {
			console.error(`USER INFO: No user data received for user id: ${targetUserId}`);
			initUsersSection();
		} else {
			// console.log(`USER INFO: user data received:`, userInfo);
			renderUserInfo(userInfo);
		}

	} catch (err) {
		console.error("Error loading user info:", err);
	}

}

export function initUserInfoSectionFromChat(targetUserId :number) {

	[	"#menuBackButton",
		"#usersSectionButton"].forEach(clearEvents);

	menuBackButton = document.getElementById("menuBackButton")!;
	menuBackButton.addEventListener("click", initUsersSection);

	const chatsSectionButton = document.getElementById("chatsSectionButton")!;
	if (chatsSectionButton) {
		chatsSectionButton.addEventListener("click", openChats);
	}

	initUserInfoSection(targetUserId);
}

/* ========================================= USERS SECTION ================================== */

function updateUserListStatus(updates: Map<number, OnlineStatus>): void {
    updates.forEach((status, userId) => {
        // Update in user list
        const userElement = document.querySelector(`#usersList .menu-list-element[data-user-id="${userId}"]`);
        if (userElement) {
            const statusSpan = userElement.querySelector('.user-status-online, .user-status-offline, .user-status-unknown');
            if (statusSpan) {
                statusSpan.className = `user-status-${status.toLowerCase()}`;
                statusSpan.textContent = Presence.display(status);
            }
        }
        
        // Update in user info section if this user is currently displayed
        const usersInfoElement = document.getElementById('usersInfo');
        if (usersInfoElement && usersInfoElement.dataset.userId === userId.toString()) {
            const userOnlineStatus = document.getElementById('userInfo_boxOnline');
            if (userOnlineStatus) {
                const statusSpan = userOnlineStatus.querySelector('.user-status-online, .user-status-offline, .user-status-unknown');
                if (statusSpan) {
                    statusSpan.className = `user-status-${status.toLowerCase()}`;
                    statusSpan.textContent = Presence.display(status);
                }
            }
        }
    });
}

function renderUserList(users: UserListRow[]): void {

	["usersList"].forEach(showElementById);

	if (users.length === 0) {
		switch(currentFilter) {
			case 'friends':
				usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noFriends">${t("noFriends")}</h1>`;
				break;
			case 'requests_in':
				usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noRequests">${t("noRequests")}</h1>`;
				break;
			case 'requests_out':
				usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noRequests">${t("noRequests")}</h1>`;
				break;
			case 'blocked':
				usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noBlocked">${t("noBlocked")}</h1>`;
				break;
			default:
				usersList.innerHTML = `<h1 id="noUsers" class="menu-empty-list-text" data-i18n="noUsers">${t("noUsers")}</h1>`;
				break;
		}
		return;
	}

	// users.map(u => {
	// 	console.log(`USER: user: [${u.user_id}] [${u.username}], aka:[${u.alias}], avatar:[${u.avatar_filename}], online:[${u.user_status}], friendship:[${u.friendship_status}]`);
	// });

	usersList.innerHTML = users.map(u => {
		// const avatarSrc = `${window.location.origin}/api/users/${u.user_id}/avatar`;
		const avatarSrc = User.getAvatarUrl(u.user_id, u.avatar_updated_at);

		const userName = u.alias
			? `${u.username} aka ${u.alias}`
			: u.username;

		const userOnlineStatus = presence.onlineStatus(u.user_id);

  		// Only show user_status if friendship exists
		const statusHtml = u.friendship_status
			? `<span class="user-status-${userOnlineStatus.toLowerCase()}">${Presence.display(userOnlineStatus)}</span>`
			: `<span class="user-status-unknown"></span>`;

		return `
			<div class="menu-list-element " data-user-id="${u.user_id}">
				<img class="user-list-avatar" src="${avatarSrc}">
				<div class="user-list-element-info">
					<span>${userName}</span>
					${statusHtml}
				</div>
			</div>
		`;
	}).join("");

	document.querySelectorAll(".menu-list-element ").forEach(u => {
		u.addEventListener("click", () => {
			const userId = (u as HTMLElement).dataset.userId;
			// console.log(`User TARGET id: ${userId}=`, userId);
			// console.log("Full dataset:", (u as HTMLElement).dataset);
			if (userId) {
				initUserInfoSection(parseInt(userId));
			}
		});
	});

}

async function loadUsers(): Promise<void>{
	try {
		let res;
		if (!user.isLoggedIn()) {
			currentFilter = 'all';
		}
		switch (currentFilter) {
			case 'friends':
				// console.log("USERS: Loading FRIENDS only");
				res = await fetchWithAuth(`${API_USERS_FRIENDS}`, {
					method: 'GET'
				});
				setFilterForUsersList("friends");
				break;
			case 'requests_in':
				// console.log("USERS: Loading REQUESTS IN only");
				res = await fetchWithAuth(`${API_USERS_FRIENDS}/incoming`, {
					method: 'GET'
				});
				setFilterForUsersList("requestsIn");
				break;
			case 'requests_out':
				// console.log("USERS: Loading REQUESTS OUT only");
				res = await fetchWithAuth(`${API_USERS_FRIENDS}/outgoing`, {
					method: 'GET'
				});
				setFilterForUsersList("requestsOut");
				break;
			case 'blocked':
				// console.log("USERS: Loading BLOCKED users only");
				res = await fetchWithAuth(`${API_USERS_BLOCKS}`, {
					method: 'GET'
				});
				setFilterForUsersList("blocked");
				break;
			// works for 'all' and an invalid filter
			default:
				// console.log("USERS: Loading ALL users");
				res = await fetchWithAuth(`${API_USERS_FRIENDS}/allusers`, {
					method: 'GET'
				});
				setFilterForUsersList("allUsers");
				setHeaderTitle("allUsers");
				break;
		}
		if (!res.ok) {
			if (res.status === 401) {
				user.logout();
				(window as any).navigateTo('/login');
				return;
			}
			throw new Error(`Failed to fetch users for menu`);
		}
		const users: UserListRow[] = await res.json();
		renderUserList(users);
	} catch (err) {
		console.error("Error loading users:", err);
	}
}

export async function initUsersSection(): Promise<void> {
	clearBeforeOpenUsersSection();
	resetUsersSection();
	if (user.isLoggedIn()) {
		["menuHeaderTitle"].forEach(hideElementById);
		["menuDropdown"].forEach(showElementById);
		const userBtn = document.getElementById("usersSectionButton");
		if (userBtn) {
			userBtn.className = "menu-control-panel-button-pressed";
		}
		const chatsBtn = document.getElementById("chatsSectionButton");
		if (chatsBtn) {
			chatsBtn.className = "menu-control-panel-button";
		}
	}
	["usersList"].forEach(showElementById);

	await loadUsers();
	
	// Subscribe to presence updates if not already subscribed
	if (!presenceUnsubscribe) {
		presenceUnsubscribe = presence.onUpdate(updateUserListStatus);
	}
}

/* ========================================= INITIALIZATION SECTION ========================= */

export function cleanupUsersPresenceSubscription(): void {
	if (presenceUnsubscribe) {
		presenceUnsubscribe();
		presenceUnsubscribe = null;
	}
}

function addMenuDropdown(): boolean {

	const menuDropdown = document.querySelector(".menu-dropdown");
	if (!menuDropdown) {
		console.error("USERS: Menu dropdown element not found, cannot add dropdown content");
		return false;
	}

	menuDropdown.innerHTML = `
		<button id="menuDropdownButton" class="menu-dropbtn menu-header-title" data-i18n="allUsers">${t("allUsers")}</button>
		<div class="menu-dropdown-content">
			<a id="menuDropdownAll" data-i18n="allUsers">${t("allUsers")}</a>
			<a id="menuDropdownFriends" data-i18n="friends">${t("friends")}</a>
			<a id="menuDropdownRequestsIn" data-i18n="requestsIn">${t("requestsIn")}</a>
			<a id="menuDropdownRequestsOut" data-i18n="requestsOut">${t("requestsOut")}</a>
			<a id="menuDropdownBlocked" data-i18n="blocked">${t("blocked")}</a>
		</div>
	`;
	
	// Translate the newly added elements
	import('../i18n/index.js').then(({ i18n }) => {
		i18n.initializePage();
	});

	const menuDropdownButton = document.getElementById('menuDropdownButton');
    const menuDropdownContent = document.querySelector('.menu-dropdown-content');

    if (menuDropdownButton && menuDropdownContent) {
        menuDropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdownContent.classList.toggle('show');
			menuDropdownButton.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            menuDropdownContent.classList.remove('show');
			menuDropdownButton.classList.remove('show');
        });
    }

	["menuDropdown"].forEach(showElementById);
	return true;
}

function initFilterDropdown(): void {

	currentFilter = 'all';
	setFilterForUsersList("allUsers");

	if (!document.getElementById("menuDropdownButton")) {
		["menuDropdown"].forEach(showElementById);
		return;
	}
	if (!addMenuDropdown()) { return; }

	const dropdownAll = document.getElementById("menuDropdownAll");
	const dropdownFriends = document.getElementById("menuDropdownFriends");
	const dropdownRequestsIn = document.getElementById("menuDropdownRequestsIn");
	const dropdownRequestsOut = document.getElementById("menuDropdownRequestsOut");
	const dropdownBlocked = document.getElementById("menuDropdownBlocked");

	if (!dropdownAll || !dropdownFriends || !dropdownRequestsIn || !dropdownRequestsOut || !dropdownBlocked) {
		console.error("USERS: One or more filter dropdown elements not found, cannot initialize filter dropdown");
		return;
	}
	dropdownAll.addEventListener("click", () => {
		currentFilter = 'all';
		setFilterForUsersList("allUsers");
		// console.log("USERS: Filter set to ALL");
		initUsersSection();
	});
	dropdownFriends.addEventListener("click", () => {
		currentFilter = 'friends';
		setFilterForUsersList("friends");
		// console.log("USERS: Filter set to FRIENDS");
		initUsersSection();
	});
	dropdownRequestsIn.addEventListener("click", () => {
		currentFilter = 'requests_in';
		setFilterForUsersList("requestsIn");
		// console.log("USERS: Filter set to REQUESTS IN");
		initUsersSection();
	});
	dropdownRequestsOut.addEventListener("click", () => {
		currentFilter = 'requests_out';
		setFilterForUsersList("requestsOut");
		// console.log("USERS: Filter set to REQUESTS OUT");
		initUsersSection();
	});
	dropdownBlocked.addEventListener("click", () => {
		currentFilter = 'blocked';
		setFilterForUsersList("blocked");
		// console.log("USERS: Filter set to BLOCKED");
		initUsersSection();
	});
}

export async function openUsersSection(): Promise<void> {
	// console.log("USERS: Users Section opened");
	initializeGlobals();

	if (!menuBackButton || !usersList || !usersInfo || !sendFriendRequestButton
		|| !cancelFriendRequestButton || !acceptFriendRequestButton || !declineFriendRequestButton
		|| !removeFriendButton || !unblockUserButton || !openChatButton || !blockUserButton) {
			console.error("One or more required elements not found, cannot open Users section");
			return;
	}

	if (user.isLoggedIn()) {
		initFilterDropdown();
		["menuHeaderTitle"].forEach(hideElementById);
	} else {
		["menuDropdown"].forEach(hideElementById);
		["menuHeaderTitle"].forEach(showElementById);
	}

	await initUsersSection();
}
