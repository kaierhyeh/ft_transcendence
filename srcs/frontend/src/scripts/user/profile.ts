import { initMatchHistory } from './match_history.js';
import user from './User.js';

declare const Chart: any;

export async function initProfile() {
	interface User {
		id: number;
		username: string;
		email: string;
		created_at: string;
		wins: number;
		losses: number;
		curr_winstreak: number;
		best_winstreak: number;
		total_points_scored: number;
	}

	const fictionalUser: User = {
		id: 1,
		username: "PlayerOne",
		email: "playerone@example.com",
		created_at: "2023-01-01T00:00:00Z",
		wins: 25,
		losses: 10,
		curr_winstreak: 5,
		best_winstreak: 8,
		total_points_scored: 1500
	};

	const mockUsers: User[] = [
		fictionalUser,
		{ id: 2, username: "PlayerTwo", email: "playertwo@example.com", created_at: "2023-02-01T00:00:00Z", wins: 20, losses: 15, curr_winstreak: 3, best_winstreak: 6, total_points_scored: 1200 },
		{ id: 3, username: "PlayerThree", email: "playerthree@example.com", created_at: "2023-03-01T00:00:00Z", wins: 30, losses: 5, curr_winstreak: 10, best_winstreak: 12, total_points_scored: 1800 },
		{ id: 4, username: "PlayerFour", email: "playerfour@example.com", created_at: "2023-04-01T00:00:00Z", wins: 15, losses: 20, curr_winstreak: 2, best_winstreak: 4, total_points_scored: 900 },
		{ id: 5, username: "PlayerFive", email: "playerfive@example.com", created_at: "2023-05-01T00:00:00Z", wins: 10, losses: 25, curr_winstreak: 1, best_winstreak: 3, total_points_scored: 600 }
	];

	let playerChart: any = null;

	function displayUserProfile(user: User) {
		const joinDate = new Date(user.created_at).toLocaleDateString('en-EN');

		const usernameElement = document.getElementById('profileUsername');
		const emailElement = document.getElementById('profileEmail');
		const joinDateElement = document.getElementById('profileJoinDate');
		const currentStreakElement = document.getElementById('statsCurrentStreak');
		const bestStreakElement = document.getElementById('statsBestStreak');
		const profileSection = document.getElementById('profileSection');

		if (usernameElement)
			usernameElement.textContent = user.username;
		if (emailElement)
			emailElement.textContent = user.email;
		if (joinDateElement)
			joinDateElement.textContent = 'Member since ' + joinDate;
		if (currentStreakElement)
			currentStreakElement.textContent = user.curr_winstreak.toString();
		if (bestStreakElement)
			bestStreakElement.textContent = user.best_winstreak.toString();

		if (profileSection)
			profileSection.style.display = 'block';
        if (matchHistorySection)
            matchHistorySection.style.display = 'block';

		setTimeout(function () {
			createPlayerChart(user);
			displayPlayerRanking(user);
		}, 50);
	}

	function createPlayerChart(user: User) {
		const canvasElement = document.getElementById('playerChart') as HTMLCanvasElement;
		if (!canvasElement)
			return;

		const ctx = canvasElement.getContext('2d');
		if (!ctx)
			return;

		if (playerChart)
			playerChart.destroy();

		playerChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: ['Wins', 'Losses'],
				datasets: [{
					data: [user.wins, user.losses],
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

	function displayPlayerRanking(selectedUser: User) {
		const rankingContainer = document.getElementById('playerRanking');
		if (!rankingContainer)
			return;

		rankingContainer.innerHTML = '';

		const sortedUsers: User[] = [];
		for (let i = 0; i < mockUsers.length; i++) {
			sortedUsers.push(mockUsers[i]);
		}

		sortedUsers.sort(function (a: User, b: User) {
			let pointsA = 0;
			let pointsB = 0;

			if (a.total_points_scored)
				pointsA = a.total_points_scored;
			if (b.total_points_scored)
				pointsB = b.total_points_scored;

			return pointsB - pointsA;
		});

		let playerIndex = -1;
		for (let i = 0; i < sortedUsers.length; i++) {
			if (sortedUsers[i].id === selectedUser.id) {
				playerIndex = i;
				break;
			}
		}

		let playersToShow: User[] = [];
		const totalUsers = sortedUsers.length;

		if (totalUsers <= 5)
			playersToShow = sortedUsers;
		else if (playerIndex <= 2)
			playersToShow = sortedUsers.slice(0, 5);
		else if (playerIndex >= totalUsers - 3)
			playersToShow = sortedUsers.slice(-5);
		else
			playersToShow = sortedUsers.slice(playerIndex - 2, playerIndex + 3);

		for (let i = 0; i < playersToShow.length; i++) {
			const player = playersToShow[i];

			let actualRank = -1;
			for (let j = 0; j < sortedUsers.length; j++) {
				if (sortedUsers[j].id === player.id) {
					actualRank = j + 1;
					break;
				}
			}

			const isCurrentPlayer = (player.id === selectedUser.id);
			const item = document.createElement('div');
			item.className = 'rank-item';

			if (isCurrentPlayer)
				item.className += ' current';
			else if (actualRank < playerIndex + 1)
				item.className += ' above';
			else
				item.className += ' below';

			let points = 0;
			if (player.total_points_scored)
				points = player.total_points_scored;

			item.innerHTML =
				'<div class="rank-position">#' + actualRank + '</div>' +
				'<div class="rank-name">' + player.username + '</div>' +
				'<div class="rank-wins">' + points + ' pts</div>';

			rankingContainer.appendChild(item);
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
    const matchHistorySection = document.getElementById('matchHistorySection');

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
        if (matchHistorySection) matchHistorySection.style.display = 'none';
		return;
	}

	displayUserProfile(fictionalUser);

	await initMatchHistory();
}