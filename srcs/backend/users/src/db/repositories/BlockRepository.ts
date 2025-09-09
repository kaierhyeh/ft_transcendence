import Database from "better-sqlite3";

export class BlockRepository {

    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }
}