import { i18n } from '../i18n/i18n.js';
import user from '../user/User.js';
import { closeMenuWindow } from "./menu.js";

// Hide an element by its ID
export function hideElementById(id: string): void {
	const element = document.getElementById(id);
	if (element) {
		element.classList.add("hidden");
	}
}

// Unhide an element by its ID
export function showElementById(id: string): void {
	const element = document.getElementById(id);
	if (element) {
		element.classList.remove("hidden");
	}
}

// To remove all event listeners from an element and its children
// after that need to reset references (parent and children)
// because old references still connected with old elements
export function clearEvents(toReset: string): void {
	// Clear all event listeners for Friends, Users, Chats
	const oldElement = document.querySelector(toReset);
	if (!oldElement) { return; }
	const newElement = oldElement.cloneNode(true);
	oldElement.replaceWith(newElement);
}

export function setElementActive(id: string, isActive: boolean): void {
	// funcion to set or unset that button is active - for example when section is opened
	const element = document.getElementById(id);
	if (element) {
		if (isActive) {
			console.log(`INFO: Setting element ${id} as active`);
		} else {
			console.log(`INFO: Setting element ${id} as inactive`);
		}
	}
}

export function setFilterForUsersList(translationKey: string): void {
	const menuDropdownButton = document.getElementById("menuDropdownButton");
	if (menuDropdownButton) {
		menuDropdownButton.textContent = i18n.t(translationKey as any);
		menuDropdownButton.setAttribute('data-i18n', translationKey);
	}
}

export function setHeaderTitle(translationKey: string) {
	const menuHeaderTitle = document.getElementById("menuHeaderTitle");
	if (menuHeaderTitle) {
		if (translationKey === 'allUsers' || translationKey === 'chats' || translationKey === 'userInfo') {
			menuHeaderTitle.textContent = i18n.t(translationKey as any);
			menuHeaderTitle.setAttribute("data-i18n", translationKey);
		} else {
			if (menuHeaderTitle.hasAttribute("data-i18n")) {
				menuHeaderTitle.removeAttribute("data-i18n");
			}
			menuHeaderTitle.textContent = translationKey;
		}
	}
}
