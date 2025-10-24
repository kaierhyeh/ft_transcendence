import { updateHeaderAvatar } from '../header.js';
import user from '../user/User.js';
import { setup2fa, activate2fa, disable2fa, get2faStatus } from '../api.js';

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
		}
		else if (profileAvatar)
			profileAvatar.style.display = 'none';

		if (profileUsername)
			profileUsername.textContent = user.username || 'Unknown';
		
		if (profileEmail) {
			if (user.email) {
				profileEmail.textContent = user.email;
				profileEmail.style.display = 'block';
			} else {
				profileEmail.style.display = 'none';
			}
		}

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

	async function removeAvatar() {
		try {
			const confirmed = confirm('Are you sure you want to remove your avatar? This will reset it to the default image.');
			if (!confirmed) return;

			const response = await fetch(`${API_USERS_ENDPOINT}/me/avatar`, {
				method: 'DELETE',
				credentials: 'include',
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
				console.error('Avatar removal failed:', response.status, responseBody);
				const serverMessage = responseBody && typeof responseBody === 'object' && responseBody.error ? responseBody.error : (typeof responseBody === 'string' ? responseBody : null);
				throw new Error(serverMessage || `Failed to remove avatar (status ${response.status})`);
			}

			await user.fetchAndUpdate();
			updateHeaderAvatar();
			displayProfile();
		} catch (error) {
			console.error('Error removing avatar:', error);
			alert(`Failed to remove avatar: ${(error as Error).message}`);
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
		const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;

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
			console.log('2FA button found, setting up event listener');
			
			// Check 2FA status on load and set button text accordingly
			get2faStatus().then(is2FAEnabled => {
				console.log('2FA status:', is2FAEnabled);
				if (is2FAEnabled) {
					twoFABtn.textContent = 'Disable 2FA';
					twoFABtn.classList.add('enabled');
				}
			}).catch(error => {
				console.error('Error checking 2FA status:', error);
			});

			twoFABtn.addEventListener('click', async (e) => {
				console.log('2FA button clicked');
				e.preventDefault();
				
				let is2FAEnabled = await get2faStatus();
				console.log('Current 2FA status:', is2FAEnabled);
				
				if (is2FAEnabled) {
					// Disable 2FA
					const confirmed = confirm('Are you sure you want to disable 2FA?');
					console.log('User confirmation:', confirmed);
					if (confirmed) {
						console.log('Before disable - button text:', twoFABtn.textContent);
						const success = await disable2fa();
						console.log('Disable result:', success);
						if (success) {
							is2FAEnabled = false; // Update the state
							console.log('Updating button text from', twoFABtn.textContent, 'to Enable 2FA');
							twoFABtn.textContent = 'Enable 2FA';
							twoFABtn.classList.remove('enabled');
							console.log('After update - button text:', twoFABtn.textContent);
							console.log('Button classList:', twoFABtn.classList.toString());
							
							// Force UI update
							twoFABtn.style.display = 'none';
							setTimeout(() => {
								twoFABtn.style.display = '';
							}, 10);
						} else {
							console.error('Disable failed, success was false');
							alert('Failed to disable 2FA. Please try again.');
						}
					} else {
						console.log('User cancelled disable');
					}
				} else {
					// Enable 2FA - show setup modal
					console.log('Starting 2FA setup...');
					const wasActivated = await handle2FASetup();
					if (wasActivated) {
						// Update the state and UI after successful activation
						is2FAEnabled = true;
						twoFABtn.textContent = 'Disable 2FA';
						twoFABtn.classList.add('enabled');
					}
				}
			});
		} else {
			console.error('2FA button not found!');
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

		if (removeAvatarBtn) {
			removeAvatarBtn.addEventListener('click', (e) => {
				e.preventDefault();
				removeAvatar();
			});
		}
	}

	async function handle2FASetup(): Promise<boolean> {
		return new Promise(async (resolve) => {
			try {
				console.log('handle2FASetup called');
				const response = await setup2fa();
				console.log('setup2fa response:', response);
				
				if (!response) {
					console.error("Failed to set up 2FA - no response");
					alert("Failed to set up 2FA");
					resolve(false);
					return;
				}

				// Show the QR code and secret key
				const qrcodeImg = document.getElementById('qrcode-img') as HTMLImageElement;
				qrcodeImg.src = response.qrCode;

				const secretKey = document.getElementById('secret-key') as HTMLElement;
				if (secretKey) {
					secretKey.textContent = response.secret;
				}

				// Show the modal
				const twofaModal = document.getElementById('2fa-modal') as HTMLElement;
				twofaModal.style.display = 'flex';

				// Get the token input field and auto-focus it
				const twofaTokenInput = document.getElementById('2fa-token') as HTMLInputElement;
				if (twofaTokenInput) {
					// Small delay to ensure modal is visible before focusing
					setTimeout(() => {
						twofaTokenInput.focus();
					}, 100);
				}

				// Setup modal event handlers
				const activateBtn = document.getElementById('activate-2fa-btn') as HTMLButtonElement;
				const cancelBtn = document.getElementById('cancel-2fa-btn') as HTMLButtonElement;
				const closeBtn = document.getElementById('close-2fa-modal') as HTMLElement;

				const closeModal = (success: boolean = false) => {
					twofaModal.style.display = 'none';
					const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
					if (twofaErrorMsg) twofaErrorMsg.textContent = '';
					const twofaTokenInput = document.getElementById('2fa-token') as HTMLInputElement;
					if (twofaTokenInput) twofaTokenInput.value = '';
					
					// Remove event listeners
					twofaModal.removeEventListener('click', handleOutsideClick);
					if (twofaTokenInput)
						twofaTokenInput.removeEventListener('keypress', handleEnterKey);
					document.removeEventListener('keydown', handleEscKey);
					
					resolve(success);
				};

				// Click outside modal to close
				const handleOutsideClick = (event: MouseEvent) => {
					if (event.target === twofaModal) {
						closeModal(false);
					}
				};
				twofaModal.addEventListener('click', handleOutsideClick);

				// Press Enter to submit
				const handleEnterKey = (event: KeyboardEvent) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						activateBtn.click();
					}
				};
				if (twofaTokenInput) {
					twofaTokenInput.addEventListener('keypress', handleEnterKey);
				}

				// Press ESC to close
				const handleEscKey = (event: KeyboardEvent) => {
					if (event.key === 'Escape') {
						event.preventDefault();
						closeModal(false);
					}
				};
				document.addEventListener('keydown', handleEscKey);

				cancelBtn.onclick = () => closeModal(false);
				closeBtn.onclick = () => closeModal(false);

				activateBtn.onclick = async () => {
					const twofaTokenInput = document.getElementById('2fa-token') as HTMLInputElement;
					const token = twofaTokenInput.value.trim();

					if (token.length !== 6 || !/^\d+$/.test(token)) {
						const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
						twofaErrorMsg.textContent = "The code must contain 6 digits";
						return;
					}

					const success = await activate2fa(token);
					if (success) {
						alert("2FA activated successfully!");
						closeModal(true);
					} else {
						const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
						twofaErrorMsg.textContent = "Invalid or expired code. Please try again.";
					}
				};

			} catch (error) {
				console.error("Error setting up 2FA:", error);
				alert("Failed to set up 2FA. Please try again.");
				resolve(false);
			}
		});
	}

	loadProfile();
	setupEventListeners();
}
