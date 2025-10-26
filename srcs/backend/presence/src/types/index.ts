export interface Message {
    type: string;
    data?: object;
}

export interface UserStatus {
  userId: number;
  status: "online" | "offline"; // maybe add "unknown" for the edge case where a friendship while both are connected
}

export interface FriendsMessage extends Message {
    type: "friends";
    data: {
        friends: UserStatus[];
    };
}

export interface FriendStatusChangeMessage extends Message {
    type: "friend_status_change";
    data: UserStatus;
}