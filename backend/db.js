import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'db.json');

export async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initial = { images: [] };
      await writeDB(initial);
      return initial;
    }
    throw error;
  }
}

export async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function addImage(imageRecord) {
  const db = await readDB();
  db.images.push(imageRecord);
  await writeDB(db);
}

export async function updateImage(id, updates) {
  const db = await readDB();
  const index = db.images.findIndex((img) => img.id === id);
  if (index !== -1) {
    db.images[index] = { ...db.images[index], ...updates };
    await writeDB(db);
  }
}

export async function getImage(id) {
  const db = await readDB();
  return db.images.find((img) => img.id === id);
}

export async function getAllImages() {
  const db = await readDB();
  return db.images;
}
export async function clearAllImages() {
  await writeDB({ images: [] });
}
