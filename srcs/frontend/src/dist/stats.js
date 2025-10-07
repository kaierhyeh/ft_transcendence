export function initStats() {
    let users = [];
    let playerChart = null;
    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Network error');
            }
            const data = await response.json();
            users = data.users;
            displayUserList();
            const loadingElement = document.getElementById('loading');
            const contentElement = document.getElementById('content');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            if (contentElement) {
                contentElement.style.display = 'block';
            }
        }
        catch (error) {
            console.error('Error:', error);
            const loadingElement = document.getElementById('loading');
            const errorElement = document.getElementById('error');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            if (errorElement) {
                errorElement.style.display = 'block';
            }
        }
    }
    function displayUserList() {
        const userList = document.getElementById('userList');
        if (!userList) {
            return;
        }
        userList.innerHTML = '';
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const button = document.createElement('button');
            button.className = 'user-button';
            button.textContent = user.username;
            button.onclick = function () {
                selectUser(user.id);
            };
            userList.appendChild(button);
        }
    }
    async function selectUser(userId, evt) {
        const allButtons = document.querySelectorAll('.user-button');
        allButtons.forEach(btn => btn.classList.remove('selected'));
        if (evt?.target)
            evt.target.classList.add('selected');
        try {
            const response = await fetch('/api/users/' + userId);
            if (!response.ok) {
                throw new Error('User not found');
            }
            const data = await response.json();
            displayUserProfile(data.user);
        }
        catch (error) {
            console.error('Error:', error);
            alert('Error loading user profile');
        }
    }
    function displayUserProfile(user) {
        const joinDate = new Date(user.created_at).toLocaleDateString('en-EN');
        const usernameElement = document.getElementById('profileUsername');
        const emailElement = document.getElementById('profileEmail');
        const joinDateElement = document.getElementById('profileJoinDate');
        const currentStreakElement = document.getElementById('statsCurrentStreak');
        const bestStreakElement = document.getElementById('statsBestStreak');
        const profileSection = document.getElementById('profileSection');
        if (usernameElement) {
            usernameElement.textContent = user.username;
        }
        if (emailElement) {
            if (user.email) {
                emailElement.textContent = user.email;
            }
            else {
                emailElement.textContent = 'Email not provided';
            }
        }
        if (joinDateElement) {
            joinDateElement.textContent = 'Member since ' + joinDate;
        }
        if (currentStreakElement) {
            if (user.curr_winstreak) {
                currentStreakElement.textContent = user.curr_winstreak.toString();
            }
            else {
                currentStreakElement.textContent = '0';
            }
        }
        if (bestStreakElement) {
            if (user.best_winstreak) {
                bestStreakElement.textContent = user.best_winstreak.toString();
            }
            else {
                bestStreakElement.textContent = '0';
            }
        }
        if (profileSection) {
            profileSection.style.display = 'block';
        }
        setTimeout(function () {
            createPlayerChart(user);
            displayPlayerRanking(user);
        }, 50);
    }
    function createPlayerChart(user) {
        const canvasElement = document.getElementById('playerChart');
        if (!canvasElement) {
            return;
        }
        const ctx = canvasElement.getContext('2d');
        if (!ctx) {
            return;
        }
        if (playerChart) {
            playerChart.destroy();
        }
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
                            label: function (context) {
                                const total = context.dataset.data.reduce(function (a, b) {
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
    function displayPlayerRanking(selectedUser) {
        const rankingContainer = document.getElementById('playerRanking');
        if (!rankingContainer) {
            return;
        }
        rankingContainer.innerHTML = '';
        const sortedUsers = [];
        for (let i = 0; i < users.length; i++) {
            sortedUsers.push(users[i]);
        }
        sortedUsers.sort(function (a, b) {
            let pointsA = 0;
            let pointsB = 0;
            if (a.total_points_scored) {
                pointsA = a.total_points_scored;
            }
            if (b.total_points_scored) {
                pointsB = b.total_points_scored;
            }
            return pointsB - pointsA;
        });
        let playerIndex = -1;
        for (let i = 0; i < sortedUsers.length; i++) {
            if (sortedUsers[i].id === selectedUser.id) {
                playerIndex = i;
                break;
            }
        }
        let playersToShow = [];
        const totalUsers = sortedUsers.length;
        if (totalUsers <= 5) {
            playersToShow = sortedUsers;
        }
        else if (playerIndex <= 2) {
            playersToShow = sortedUsers.slice(0, 5);
        }
        else if (playerIndex >= totalUsers - 3) {
            playersToShow = sortedUsers.slice(-5);
        }
        else {
            playersToShow = sortedUsers.slice(playerIndex - 2, playerIndex + 3);
        }
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
            if (isCurrentPlayer) {
                item.className += ' current';
            }
            else if (actualRank < playerIndex + 1) {
                item.className += ' above';
            }
            else {
                item.className += ' below';
            }
            let points = 0;
            if (player.total_points_scored) {
                points = player.total_points_scored;
            }
            item.innerHTML =
                '<div class="rank-position">#' + actualRank + '</div>' +
                    '<div class="rank-name">' + player.username + '</div>' +
                    '<div class="rank-wins">' + points + ' pts</div>';
            rankingContainer.appendChild(item);
        }
    }
    loadUsers();
}
//# sourceMappingURL=stats.js.map