import { initMatchHistory } from './match_history.js';
import { fetchLeaderboard } from './api.js';
import user from './User.js';
import { User } from './User.js';
import { t } from '../i18n/i18n.js';

declare const Chart: any;

export async function initProfile() {
	interface UserPublicData {
		user_id: number;
		username: string;
		alias: string | null;
		email: string | null;
		avatar_url: string;
		avatar_updated_at: string;
		created_at: string;
		// + some LiteStats
		wins: number;
		losses: number;
		curr_winstreak: number;
		best_winstreak: number;
		total_point_scored: number;
	}

	let playerChart: any = null;

	let isOtherUser: boolean = false;

	async function displayUserProfile(userData: UserPublicData) {
		const joinDate = new Date(userData.created_at).toLocaleDateString('en-EN');

		const profileAvatarElement = document.getElementById('profileAvatar') as HTMLElement;
		const usernameElement = document.getElementById('profileUsername');
		const emailElement = document.getElementById('profileEmail');
		const joinDateElement = document.getElementById('profileJoinDate');
		const currentStreakElement = document.getElementById('statsCurrentStreak');
		const bestStreakElement = document.getElementById('statsBestStreak');
		const profileSection = document.getElementById('profileSection');

		if (profileAvatarElement && userData.avatar_url)
		{
			profileAvatarElement.style.backgroundImage = `url(${userData.avatar_url})`;
			profileAvatarElement.style.display = 'block';
			console.log(userData.avatar_url);
		}
		else
			profileAvatarElement.style.display = 'none';
		if (usernameElement)
			usernameElement.textContent = userData.username || userData.alias;
		if (emailElement) {
			if (userData.email) {
				emailElement.textContent = userData.email;
				emailElement.style.display = 'block';
			} else {
				emailElement.style.display = 'none';
			}
		}
		if (joinDateElement)
			joinDateElement.textContent = t("memberSince") + ' ' + joinDate;
		if (currentStreakElement)
			currentStreakElement.textContent = userData.curr_winstreak?.toString() || '0';
		if (bestStreakElement)
			bestStreakElement.textContent = userData.best_winstreak?.toString() || '0';

		const profileLoadingElement = document.getElementById('profileLoading');
		if (profileSection) {
			profileSection.style.display = 'block';
			profileSection.style.visibility = 'hidden';
		}
		if (profileLoadingElement) {
			profileLoadingElement.style.display = 'flex';
		}

		try {
			createPlayerChart(userData);
			await displayPlayerRanking(userData);
		} catch (e) {
			console.error('Error while preparing profile stats:', e);
		}

		if (profileLoadingElement)
			profileLoadingElement.style.display = 'none';
		if (profileSection) {
			profileSection.style.visibility = 'visible';
			profileSection.style.display = 'block';
		}
	}

	function createPlayerChart(user: any) {
		const canvasElement = document.getElementById('playerChart') as HTMLCanvasElement;
		if (!canvasElement)
			return;

		const ctx = canvasElement.getContext('2d');
		if (!ctx)
			return;

		if (playerChart)
			playerChart.destroy();

		const wins = user.wins || 0;
		const losses = user.losses || 0;

		if (wins === 0 && losses === 0) {
			const noDataElement = document.getElementById('noDataChart');
			if (noDataElement) {
				noDataElement.style.display = 'block';
				canvasElement.style.display = 'none';
			}
			return;
		}

		const noDataElement = document.getElementById('noDataChart');
		if (noDataElement)
			noDataElement.style.display = 'none';
		canvasElement.style.display = 'block';

		playerChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: ['Wins', 'Losses'],
				datasets: [{
					data: [wins, losses],
					backgroundColor: ['#4ade80', '#f87171'],
					borderColor: ['#22c55e', '#ef4444'],
					borderWidth: 2
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 1,
				plugins: {
					legend: {
						labels: {
							color: '#fff',
							font: { family: 'Bit5x3', size: 12 }
						}
					},
					tooltip: {
						titleFont: { family: 'Bit5x3' },
						bodyFont: { family: 'Bit5x3' },
						callbacks: {
							label: function (context: any) {
								const total = context.dataset.data.reduce(function (a: number, b: number) {
									return a + b;
								}, 0);
								const percentage = ((context.parsed * 100) / total).toFixed(1);
								return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
							}
						}
					}
				}
			}
		});

		setTimeout(function () {
			if (playerChart) {
				playerChart.resize();
			}
		}, 100);
	}

	async function displayPlayerRanking(selectedUser: any) {
		const rankingContainer = document.getElementById('playerRanking');
		if (!rankingContainer)
			return;

		rankingContainer.innerHTML = '';

		const hasGamesPlayed = (selectedUser.wins || 0) + (selectedUser.losses || 0) > 0;
		if (!hasGamesPlayed) {
			const noDataElement = document.getElementById('noDataRanking');
			if (noDataElement) {
				noDataElement.style.display = 'block';
				rankingContainer.style.display = 'none';
			}
			return;
		}

		try {
			const leaderboard = await fetchLeaderboard(10);
			
			if (leaderboard.length === 0) {
				const noDataElement = document.getElementById('noDataRanking');
				if (noDataElement) {
					noDataElement.style.display = 'block';
					rankingContainer.style.display = 'none';
				}
				return;
			}

			const noDataElement = document.getElementById('noDataRanking');
			if (noDataElement) {
				noDataElement.style.display = 'none';
			}
			rankingContainer.style.display = 'block';

			let playerIndex = -1;
			for (let i = 0; i < leaderboard.length; i++) {
				if (leaderboard[i].user_id === selectedUser.id) {
					playerIndex = i;
					break;
				}
			}

			let playersToShow: any[] = [];
			const totalUsers = leaderboard.length;

			playersToShow = leaderboard;

			for (let i = 0; i < playersToShow.length; i++) {
				const player = playersToShow[i];

				let actualRank = -1;
				for (let j = 0; j < leaderboard.length; j++) {
					if (leaderboard[j].user_id === player.user_id) {
						actualRank = j + 1;
						break;
					}
				}

				const isCurrentPlayer = (player.user_id === selectedUser.id);
				const item = document.createElement('div');
				item.className = 'rank-item';

				if (isCurrentPlayer)
					item.className += ' current';
				else if (actualRank < playerIndex + 1)
					item.className += ' above';
				else
					item.className += ' below';

				let points = player.total_points_scored || 0;

				item.innerHTML =
					'<div class="rank-position">#' + actualRank + '</div>' +
					'<div class="rank-name">' + player.username + '</div>' +
					'<div class="rank-wins">' + points + ' pts</div>';

				rankingContainer.appendChild(item);
			}
		} catch (error) {
			console.error('Failed to load leaderboard:', error);
			const noDataElement = document.getElementById('noDataRanking');
			if (noDataElement) {
				noDataElement.style.display = 'block';
				rankingContainer.style.display = 'none';
			}
		}
	}

	const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

	async function checkAuth(): Promise<boolean> {
		try {
			const response = await fetch(`${API_AUTH_ENDPOINT}/verify`, {
				method: 'POST',
				credentials: 'include'
			});
			if (!response.ok) return false;
			const data = await response.json();
			return data.success;
		} catch (err) {
			return false;
		}
	}

	const profileError = document.getElementById('profileError');
	const profileSection = document.getElementById('profileSection');

	function getProfileIdFromUrl(): number | null {
		const params = new URLSearchParams(window.location.search);
		const id = params.get('id');
		if (!id) return null;
		const n = parseInt(id, 10);
		return isNaN(n) ? null : n;
	}

	const profileIdFromUrl = getProfileIdFromUrl();

	if (profileIdFromUrl !== null) {
		try {
			const resp = await fetch(`${window.location.origin}/api/users/${profileIdFromUrl}/profile`, {
				method: 'GET'
			});
			if (!resp.ok) {
				throw new Error(`Failed to fetch public profile for id ${profileIdFromUrl}`);
			}
			const publicProfile = await resp.json() as UserPublicData;
			publicProfile.avatar_url = User.getAvatarUrl(publicProfile.user_id, publicProfile.avatar_updated_at);
			isOtherUser = true;
			await displayUserProfile(publicProfile);
		} catch (err) {
			console.error('Failed to load public profile:', err);
			if (profileError) profileError.style.display = 'block';
			if (profileSection) profileSection.style.display = 'none';
			return;
		}
	} else {
		let isConnected = user.isLoggedIn();
		if (!isConnected) {
			const serverAuthenticated = await checkAuth();
			if (serverAuthenticated) {
				await user.fetchAndUpdate();
				isConnected = user.isLoggedIn();
			}
		}

		if (!isConnected) {
			if (profileError) profileError.style.display = 'block';
			if (profileSection) profileSection.style.display = 'none';
			return;
		}

		try {
			await user.fetchAndUpdate();
			const userData = user.getData();
			if (!userData)
				throw new Error('No user data available after fetch');
			await displayUserProfile(userData);
		} catch (error) {
			console.error('Failed to load user profile:', error);
			if (profileError) profileError.style.display = 'block';
			if (profileSection) profileSection.style.display = 'none';
			return;
		}
	}

	await initMatchHistory();
}