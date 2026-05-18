// Run this to generate correct bcrypt hashes
// node db/generate-hash.js
import bcrypt from 'bcryptjs';

const passwords = ['admin123', 'staff123', 'customer123'];

for (const pw of passwords) {
  const hash = await bcrypt.hash(pw, 10);
  console.log(`${pw} => ${hash}`);
}
