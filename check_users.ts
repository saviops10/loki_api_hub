
import { initDB, db } from './src/db/index.js';

async function checkUsers() {
  await initDB();
  const users = await db.query("SELECT id, username, email FROM users");
  console.log('Users in DB:', users);
}

checkUsers();
