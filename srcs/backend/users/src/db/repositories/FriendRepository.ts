import Database from "better-sqlite3";

export class FriendRepository {
    
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }
}