# ft_transcendence
Develop a web game Pong including the following features:
1. Basic user management systems for users to register, 2FA validate id, customize user settings.
2. Live chat with other users and play games remotely with Websocket.
3. Different game modes: PVE, local/remote PVP and tournament.
4. Single Page Application (SPA) for better UX.
5. Automated health test at launch time.

## Quick Start 

1. Clone the repository to your local machine.
```bash
git clone <repository-url>
cd ft_transcendence
```

2. Setup necessary credentials and launch
- 1) Generate **secret/google-oauth.env** under root folder: 
```
GOOGLE_CLIENT_ID=.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-
GOOGLE_REDIRECT_URI=https://localhost:4443/auth/google/callback
```
This is a template with no credentials. In order to log in with a Google account, a Google API set up is needed.

- 2) Choose one of the following launch methods:
```bash 
make
# Launch in foreground mode, showing real-time logs on the terminal.
make up-d
# Launch in detached mode, with the services run silently in the background.
make up_separately
# Builds services one-by-one (to avoid memory issues), then starts everything in detached mode.
```
🚀 **Access**: [https://localhost:4443](https://localhost:4443) <br><br>
3. Other commands
```bash
# Rebuild.
make re
# Stop and clean up everything.
make fclean
# Other options
make help
```
<br><br>
## 📊 Module Status Overview
**TOTAL SCORE**: 11 Major (110 points) + 5 Minor (25 points) = 135/100 points <br>
([Evaluation sheet](https://github.com/kaierhyeh/ft_transcendence/blob/main/documents/Evaluation%20sheet.pdf): 7 Major + 4 Major (2 points each) + 5 Minor (1 point each) = 🌟 Outstanding! > 125/100 points.
### Major Modules (10 points each)
| Module | Status | Points | Verification |
|--------|--------|--------|-------------|
| **Backend Framework** | ✅ Complete | 10 | Microservices architecture with Fastify/Node.js |
| **Blockchain Score Storage** | ✅ Complete | 10 | Avalanche blockchain integration with ethers.js |
| **User Management** | ✅ Complete | 10 | Authentication, JWT, user profiles |
| **Remote Authentication** | ✅ Complete | 10 | Google OAuth integration |
| **Remote Players** | ✅ Complete | 10 | WebSocket real-time multiplayer |
| **Multiplayer (>2 players)** | ✅ Complete | 10 | 4-player Pong support |
| **Additional Game + History** | ✅ Complete | 10 | Tournament system with matchmaking |
| **Live Chat** | ✅ Complete | 10 | Real-time chat with WebSocket |
| **AI Opponent** | ✅ Complete | 10 | AIController.ts implementation |
| **Two-Factor Authentication + JWT** | ✅ Complete | 10 | TOTP 2FA + JWT implementation |
| **Microservices Backend** | ✅ Complete | 10 | Docker microservices architecture |
| **Server-side Pong + API** | ✅ Complete | 10 | Server-side game logic with API |

### Minor Modules (5 points each)
| Module | Status | Points | Verification |
|--------|--------|--------|-------------|
| **Frontend Framework/Toolkit** | ✅ Complete | 5 | TypeScript with custom UI framework |
| **Database Backend** | ✅ Complete | 5 | SQLite with prepared statements |
| **User & Game Stats Dashboards** | ✅ Complete | 5 | Data visualization and charts |
| **Support on All Devices** | ⚠️ Partial | 0 | Responsive design (touch screen NOT supported) |
| **Browser Compatibility** | ✅ Complete | 5 | Firefox, Chrome, Safari, Edge support |
| **Multiple Languages** | ✅ Complete | 5 | English, Chinese, French and Russian with i18n |
