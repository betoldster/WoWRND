'use strict';

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

const STORE_NAME = 'wow-mplus';
const BLOB_KEY = 'state';
const MAX_PLAYERS = 7;
const MAX_HISTORY = 200;
const MAX_NAME_LEN = 30;
const DEFAULT_STATE = { version: 1, players: [], history: [] };

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function checkPassword(req) {
  const expected = process.env.GROUP_PASSWORD;
  if (!expected) return false;
  const provided = req.headers.get('x-group-password') || '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (providedBuf.length !== expectedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function errResponse(status, message) {
  return jsonResponse(status, { error: message });
}

exports.default = async (req) => {
  if (!checkPassword(req)) {
    return errResponse(401, 'Unauthorized');
  }

  const store = getStore(STORE_NAME);

  if (req.method === 'GET') {
    try {
      const raw = await store.get(BLOB_KEY);
      const data = raw != null ? JSON.parse(raw) : null;
      return jsonResponse(200, data ?? DEFAULT_STATE);
    } catch (e) {
      console.error('GET error:', e);
      return errResponse(500, 'Failed to load state');
    }
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await req.json();
    } catch {
      return errResponse(400, 'Invalid JSON');
    }

    if (!Array.isArray(body.players)) {
      return errResponse(400, 'players must be an array');
    }
    if (body.players.length > MAX_PLAYERS) {
      return errResponse(400, `players must have at most ${MAX_PLAYERS} entries`);
    }
    for (const p of body.players) {
      if (typeof p.id !== 'string' || !p.id) {
        return errResponse(400, 'Each player must have a non-empty string id');
      }
      if (typeof p.name !== 'string' || !p.name || p.name.length > MAX_NAME_LEN) {
        return errResponse(400, `Each player name must be a non-empty string (max ${MAX_NAME_LEN} chars)`);
      }
      if (!Array.isArray(p.classes)) {
        return errResponse(400, 'Each player must have a classes array');
      }
      for (const c of p.classes) {
        if (typeof c !== 'string') {
          return errResponse(400, 'Class names must be strings');
        }
      }
    }
    if (!Array.isArray(body.history)) {
      return errResponse(400, 'history must be an array');
    }

    const state = {
      version: 1,
      updatedAt: new Date().toISOString(),
      players: body.players,
      history: body.history.slice(0, MAX_HISTORY),
    };

    try {
      await store.set(BLOB_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('PUT error:', e);
      return errResponse(500, 'Failed to save state');
    }

    return jsonResponse(200, state);
  }

  return errResponse(405, 'Method Not Allowed');
};
