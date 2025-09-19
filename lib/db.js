import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open the SQLite database
export async function openDb() {
    return open({
        filename: './database/mydb.sqlite',
        driver: sqlite3.Database,
    });
}
