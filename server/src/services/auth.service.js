import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import env from '../config/env.js';
import { getDatabase } from '../database/mongodb.js';

function requireJwtSecret() {
  if (!env.jwtSecret) throw Object.assign(new Error('Authentication is not configured'), { status: 503 });
  return env.jwtSecret;
}
export function publicUser(user) { return { id: String(user._id), name: user.name, email: user.email, avatarUrl: user.avatarUrl }; }
export function issueToken(user) { return jwt.sign({ sub: String(user._id), email: user.email, name: user.name }, requireJwtSecret(), { expiresIn: '7d', issuer: 'resumeiq' }); }
export function verifyToken(token) { return jwt.verify(token, requireJwtSecret(), { issuer: 'resumeiq' }); }
export async function registerUser({ name, email, password }) {
  const database = await getDatabase();
  const users = database.collection('users');
  const normalizedEmail = email.trim().toLowerCase();
  if (await users.findOne({ email: normalizedEmail })) throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
  const user = { name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
  try { const result = await users.insertOne(user); return { ...user, _id: result.insertedId }; }
  catch (error) { if (error.code === 11000) throw Object.assign(new Error('An account with this email already exists'), { status: 409 }); throw error; }
}
export async function authenticateUser({ email, password }) {
  const database = await getDatabase();
  const user = await database.collection('users').findOne({ email: email.trim().toLowerCase() });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) throw Object.assign(new Error('Email or password is incorrect'), { status: 401 });
  return user;
}
export async function findUserById(id) {
  if (!ObjectId.isValid(id)) return null;
  const database = await getDatabase();
  return database.collection('users').findOne({ _id: new ObjectId(id) });
}
export async function upsertOAuthUser({ provider, providerId, email, name, avatarUrl }) {
  const database = await getDatabase();
  const users = database.collection('users');
  const accounts = database.collection('oauthAccounts');
  const identity = { provider, providerId: String(providerId) };
  const account = await accounts.findOne(identity);
  if (account) return users.findOne({ _id: account.userId });
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();
  let user = await users.findOne({ email: normalizedEmail });
  if (user) {
    await users.updateOne({ _id: user._id }, { $set: { ...(name ? { name } : {}), ...(avatarUrl ? { avatarUrl } : {}), updatedAt: now } });
    user = await users.findOne({ _id: user._id });
  } else {
    const newUser = { email: normalizedEmail, name: name || normalizedEmail.split('@')[0], passwordHash: null, avatarUrl: avatarUrl || null, createdAt: now, updatedAt: now };
    try { const result = await users.insertOne(newUser); user = { ...newUser, _id: result.insertedId }; }
    catch (error) { if (error.code !== 11000) throw error; user = await users.findOne({ email: normalizedEmail }); }
  }
  try { await accounts.insertOne({ ...identity, userId: user._id, createdAt: now }); }
  catch (error) { if (error.code !== 11000) throw error; }
  return user;
}
