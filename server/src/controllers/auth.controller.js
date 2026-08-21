import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import env from '../config/env.js';
import { authenticateUser, issueToken, publicUser, registerUser, upsertOAuthUser } from '../services/auth.service.js';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) });
const providers = new Set(['google', 'github', 'linkedin']);
const callbackUrl = (provider) => `${env.apiBaseUrl}/api/auth/oauth/${provider}/callback`;

function providerSettings(provider) {
  const credentials = env.oauth[provider];
  if (!credentials?.clientId || !credentials?.clientSecret || !env.jwtSecret) throw Object.assign(new Error(`${provider[0].toUpperCase() + provider.slice(1)} sign-in is not configured yet`), { status: 503 });
  const common = { credentials, redirectUri: callbackUrl(provider) };
  if (provider === 'google') return { ...common, authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', userInfo: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile' };
  if (provider === 'github') return { ...common, authorize: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', userInfo: 'https://api.github.com/user', scope: 'read:user user:email' };
  return { ...common, authorize: 'https://www.linkedin.com/oauth/v2/authorization', token: 'https://www.linkedin.com/oauth/v2/accessToken', userInfo: 'https://api.linkedin.com/v2/userinfo', scope: 'openid profile email' };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw Object.assign(new Error('The identity provider rejected the sign-in request'), { status: 502 });
  return response.json();
}

export async function signup(req, res) {
  const input = signupSchema.parse(req.body);
  const user = await registerUser(input);
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
}
export async function login(req, res) {
  const input = credentialsSchema.parse(req.body);
  const user = await authenticateUser(input);
  res.json({ token: issueToken(user), user: publicUser(user) });
}
export function oauthStart(req, res) {
  const { provider } = req.params;
  if (!providers.has(provider)) throw Object.assign(new Error('Unsupported sign-in provider'), { status: 404 });
  const settings = providerSettings(provider);
  const state = jwt.sign({ provider, purpose: 'oauth', nonce: randomBytes(24).toString('hex') }, env.jwtSecret, { expiresIn: '10m', issuer: 'resumeiq' });
  res.cookie('resumeiq_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 10 * 60 * 1000, path: `/api/auth/oauth/${provider}/callback` });
  const query = new URLSearchParams({ client_id: settings.credentials.clientId, redirect_uri: settings.redirectUri, response_type: 'code', scope: settings.scope, state });
  res.redirect(`${settings.authorize}?${query}`);
}
export async function oauthCallback(req, res) {
  const { provider } = req.params;
  try {
    if (!providers.has(provider) || !req.query.code || !req.query.state) throw new Error('OAuth request is incomplete');
    const cookieState = req.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith('resumeiq_oauth_state='))?.slice('resumeiq_oauth_state='.length);
    const queryState = String(req.query.state);
    if (!cookieState || cookieState.length !== queryState.length || !timingSafeEqual(Buffer.from(cookieState), Buffer.from(queryState))) throw new Error('OAuth state does not match this browser');
    const state = jwt.verify(req.query.state, env.jwtSecret, { issuer: 'resumeiq' });
    if (state.provider !== provider || state.purpose !== 'oauth') throw new Error('OAuth state is invalid');
    const settings = providerSettings(provider);
    const body = new URLSearchParams({ client_id: settings.credentials.clientId, client_secret: settings.credentials.clientSecret, code: req.query.code, redirect_uri: settings.redirectUri, grant_type: 'authorization_code' });
    const tokenData = await fetchJson(settings.token, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const profile = await fetchJson(settings.userInfo, { headers: { Accept: 'application/json', Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'ResumeIQ' } });
    let email = profile.email;
    if (provider === 'github' && !email) {
      const emails = await fetchJson('https://api.github.com/user/emails', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'ResumeIQ' } });
      email = emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email;
    }
    if (!email) throw new Error('A verified email address is required');
    const user = await upsertOAuthUser({ provider, providerId: profile.sub ?? profile.id, email, name: profile.name ?? profile.login, avatarUrl: profile.picture ?? profile.avatar_url });
    res.clearCookie('resumeiq_oauth_state', { path: `/api/auth/oauth/${provider}/callback` });
    res.redirect(`${env.clientAppUrl}/auth/callback#token=${encodeURIComponent(issueToken(user))}`);
  } catch (error) {
    res.redirect(`${env.clientAppUrl}/login?error=${encodeURIComponent(error.message || 'Social sign-in failed')}`);
  }
}
