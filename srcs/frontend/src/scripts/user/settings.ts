import { updateHeaderAvatar } from '../header.js';
import user from '../user/User.js';

export function initSettings() {
	const API_USERS_ENDPOINT = `${window.location.origin}/api/users`;

	async function loadProfile() {
		try {
			await user.fetchAndUpdate();
			if (!user.isLoggedIn())
				throw new Error('Not authenticated');

			displayProfile();

			const loadingElement = document.getElementById('loading');
			const contentElement = document.getElementById('content');

			if (loadingElement)
				loadingElement.style.display = 'none';
			if (contentElement)
				contentElement.style.display = 'block';
		} catch (error) {
			console.error('Error in loadProfile:', error);

			const loadingElement = document.getElementById('loading');
			const errorElement = document.getElementById('error');

			if (loadingElement)
				loadingElement.style.display = 'none';
			if (errorElement) {
				errorElement.style.display = 'block';
				errorElement.textContent = `Error: ${(error as Error).message}`;
			}
		}
	}

	function displayProfile() {
		const profileAvatar = document.getElementById('profileAvatar') as HTMLElement;
		const profileUsername = document.getElementById('profileUsername');
		const profileEmail = document.getElementById('profileEmail');
		const profileAlias = document.getElementById('profileAlias');
		const aliasInput = document.getElementById('aliasInput') as HTMLInputElement;
		const profileSection = document.querySelector('.profile-section') as HTMLElement;
		const changePasswordLabel = document.querySelector('.settings-form .form-group:nth-child(2) label') as HTMLElement;
		if (profileSection)
			profileSection.style.display = 'block';
		if (changePasswordLabel)
			changePasswordLabel.style.display = 'none';

		if (profileAvatar && user.avatar_url) {
			profileAvatar.style.backgroundImage = `url(${user.avatar_url})`;
			profileAvatar.style.display = 'block';
		} else if (profileAvatar)
			profileAvatar.style.display = 'none';

		if (profileUsername)
			profileUsername.textContent = user.username || 'Unknown';

		if (profileEmail)
			profileEmail.textContent = user.email || 'Unknown';

		if (profileAlias)
			profileAlias.textContent = user.alias || 'No alias';

		if (aliasInput)
			aliasInput.value = user.alias || '';
	}	async function updateAlias() {
		const aliasInput = document.getElementById('aliasInput') as HTMLInputElement;
		const newAlias = aliasInput.value.trim();

		try {
			const response = await fetch(`${API_USERS_ENDPOINT}/me`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ alias: newAlias }),
			});

			if (!response.ok)
				throw new Error('Failed to update alias');

			await user.fetchAndUpdate();
			displayProfile();
			alert('Alias updated successfully');
		} catch (error) {
			console.error('Error updating alias:', error);
			alert('Failed to update alias');
		}
	}

	async function updatePassword() {
		const oldPassword = (document.getElementById('oldPassword') as HTMLInputElement).value;
		const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;

		if (!oldPassword || !newPassword) {
			alert('Please fill in both old and new password');
			return;
		}

		try {
			const response = await fetch(`${API_USERS_ENDPOINT}/me`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					password: { old: oldPassword, new: newPassword }
				}),
			});

			if (!response.ok)
				throw new Error('Failed to update password');

			alert('Password updated successfully');
			(document.getElementById('oldPassword') as HTMLInputElement).value = '';
			(document.getElementById('newPassword') as HTMLInputElement).value = '';
		} catch (error) {
			console.error('Error updating password:', error);
			alert('Failed to update password');
		}
	}

	async function updateAvatar(file: File) {
		const formData = new FormData();
		formData.append('avatar', file);

		try {
			const response = await fetch(`${API_USERS_ENDPOINT}/me/avatar`, {
				method: 'PUT',
				credentials: 'include',
				body: formData,
			});

			let responseBody: any = null;
			const contentType = response.headers.get('content-type') || '';
			try {
				if (contentType.includes('application/json'))
					responseBody = await response.json();
				else
					responseBody = await response.text();
			} catch (err) {
				console.warn('Failed to parse response body:', err);
			}

			if (!response.ok) {
				console.error('Avatar upload failed:', response.status, responseBody);
				const serverMessage = responseBody && typeof responseBody === 'object' && responseBody.error ? responseBody.error : (typeof responseBody === 'string' ? responseBody : null);
				throw new Error(serverMessage || `Failed to update avatar (status ${response.status})`);
			}

			await user.fetchAndUpdate();
			updateHeaderAvatar();
			displayProfile();
			alert('Avatar updated successfully');
		} catch (error) {
			console.error('Error updating avatar:', error);
			alert(`Failed to update avatar: ${(error as Error).message}`);
		}
	}

	function setupEventListeners() {
		const updateAliasBtn = document.getElementById('updateAliasBtn');
		const updatePasswordBtn = document.getElementById('updatePasswordBtn');
		const changePasswordBtn = document.getElementById('changePasswordBtn');
		const twoFABtn = document.getElementById('twoFABtn');
		const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;

		if (updateAliasBtn)
			updateAliasBtn.addEventListener('click', updateAlias);

		if (updatePasswordBtn)
			updatePasswordBtn.addEventListener('click', updatePassword);

		if (changePasswordBtn) {
			changePasswordBtn.addEventListener('click', () => {
				const passwordFields = document.getElementById('passwordFields');
				const changePasswordLabel = document.querySelector('.settings-form .form-group:nth-child(2) label') as HTMLElement;
				if (passwordFields && changePasswordLabel) {
					const isVisible = passwordFields.style.display !== 'none';
					const newDisplay = isVisible ? 'none' : 'block';
					passwordFields.style.display = newDisplay;
					changePasswordLabel.style.display = newDisplay;
				}
			});
		}

		if (twoFABtn) {
			twoFABtn.addEventListener('click', () => {
				alert('2FA is not implemented yet.');
			});
		}

		if (avatarInput) {
			avatarInput.addEventListener('change', (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
				const maxSize = 2 * 1024 * 1024;

				if (!allowedTypes.includes(file.type)) {
					alert('Invalid file type. Allowed types: jpeg, png, gif, webp');
					return;
				}

				if (file.size > maxSize) {
					alert('File too large. Maximum allowed size is 2MB.');
					return;
				}

				updateAvatar(file);
			});
		}
	}

	loadProfile();
	setupEventListeners();
}
