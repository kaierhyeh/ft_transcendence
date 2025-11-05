// No need for URL in the constant - WebSocket URL is relative
const API_PRESENCE_WS_ENDPOINT = `/api/presence/ws`;

export type OnlineStatus = "online" | "offline" | "unknown";

interface UserStatus {
  userId: number;
  status: OnlineStatus;
}

type PresenceUpdateCallback = (updates: Map<number, OnlineStatus>) => void;

export class Presence {
    private friendStatus: Map<number, OnlineStatus> = new Map();
    private ws: WebSocket | null = null;
    private callbacks: Set<PresenceUpdateCallback> = new Set();

    async checkin() {
        // Prevent multiple connections
        if (this.ws !== null) {
            console.log('⚠️ WebSocket already exists, skipping checkin');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}${API_PRESENCE_WS_ENDPOINT}`;
        
        console.log('🔌 Creating WebSocket connection to:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.ws = null;
            return;
        }

        // Wait for connection to open, then send checkin
        try {
            await new Promise<void>((resolve, reject) => {
                if (!this.ws) {
                    reject(new Error('WebSocket is null'));
                    return;
                }

                
                const ws = this.ws; // Capture in closure to avoid null issues
                
                ws.onopen = () => {
                    console.log('🔓 WebSocket opened, waiting for server ready...');
                };
                
                // Wait for "ready" message from server before sending checkin
                ws.onmessage = (event: MessageEvent) => {
                    try {
                        const message = JSON.parse(event.data);
                        
                        if (message.type === "ready") {
                            console.log('✅ Server ready signal received');
                            try {
                                ws.send(JSON.stringify({ type: "checkin" }));
                                console.log('✅ Checkin message sent');
                                resolve();
                            } catch (error) {
                                console.error('❌ Failed to send checkin:', error);
                                reject(error);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse ready message:', error);
                        reject(error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('❌ WebSocket error during connection:', error);
                    reject(error);
                };

                // Timeout after 5 seconds
                setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
            });

            // Now set up the regular message handlers
            this.setupMessageHandlers();
            
        } catch (error) {
            console.error('❌ Failed to establish WebSocket connection:', error);
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
        }
    }

    private setupMessageHandlers() {
        if (!this.ws) return;

        const ws = this.ws; // Capture to avoid null issues

        ws.onmessage = (event: MessageEvent) => {
            // console.log('📥 Message received:', event.data);
            
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === "ping") {
                    // console.log('🏓 Ping received, sending pong');
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "pong" }));
                    }
                }
                else if (message.type === "friends") {
                    const { friends } = message.data as { friends: UserStatus[] };
                    console.log('👥 Friends list received:', friends);
                    this.friendStatus.clear();
                    const updates = new Map<number, OnlineStatus>();
                    friends.forEach(friend => {
                        this.friendStatus.set(friend.userId, friend.status);
                        updates.set(friend.userId, friend.status);
                    });
                    // Notify subscribers of initial friend list
                    this.notifySubscribers(updates);
                }
                else if (message.type === "friend_status_change") {
                    const friendStatus = message.data as UserStatus;
                    console.log('🔄 Friend status change:', friendStatus);
                    this.friendStatus.set(friendStatus.userId, friendStatus.status);
                    // Notify subscribers of single status change
                    const updates = new Map<number, OnlineStatus>();
                    updates.set(friendStatus.userId, friendStatus.status);
                    this.notifySubscribers(updates);
                }
            } catch (error) {
                console.error('❌ Failed to parse message:', error);
            }
        };

        ws.onclose = (event) => {
            console.log('🔌 WebSocket closed:', {
                code: event.code,
                reason: event.reason || '(no reason)',
                wasClean: event.wasClean
            });
            
            this.ws = null;
            this.friendStatus.clear();
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error occurred:', error);
        };
    }

    checkout() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('👋 Closing WebSocket connection');
            this.ws.close();
        }
        // Note: this.ws will be nullified in onclose handler
    }

    onlineStatus(userId: number): OnlineStatus {
        const status = this.friendStatus.get(userId);
        return status ?? "unknown";
    }

    static display(status: OnlineStatus): string {
        return status === "unknown" ? "" : status;
    }

    /**
     * Subscribe to presence updates
     * @param callback Function to call when friend statuses change
     * @returns Unsubscribe function
     */
    onUpdate(callback: PresenceUpdateCallback): () => void {
        this.callbacks.add(callback);
        // Return unsubscribe function
        return () => this.callbacks.delete(callback);
    }

    /**
     * Notify all subscribers of presence updates
     * @param updates Map of user_id to online status
     */
    private notifySubscribers(updates: Map<number, OnlineStatus>): void {
        this.callbacks.forEach(callback => {
            try {
                callback(updates);
            } catch (error) {
                console.error('❌ Error in presence update callback:', error);
            }
        });
    }
}

export const presence = new Presence();