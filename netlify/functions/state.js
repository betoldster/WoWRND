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

function checkPassword(headers) {
  const expected = process.env.GROUP_PASSWORD;
  if (!expected) return false;

  const provided = headers['x-group-password'] || '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  if (providedBuf.length !== expectedBuf.length) return false;

  try {
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

function err(statusCode, message) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: message }),
  };
}

exports.handler = async (event) => {
  if (!checkPassword(event.headers)) {
    return err(401, 'Unauthorized');
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get(BLOB_KEY);
      const data = raw != null ? JSON.parse(raw) : null;
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(data ?? DEFAULT_STATE),
      };
    } catch (e) {
      console.error('GET error:', e);
      return err(500, 'Failed to load state');
    }
  }

  if (event.httpMethod === 'PUT') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return err(400, 'Invalid JSON');
    }

    if (!Array.isArray(body.players)) {
      return err(400, 'players must be an array');
    }
    if (body.players.length > MAX_PLAYERS) {
      return err(400, `players must have at most ${MAX_PLAYERS} entries`);
    }
    for (const p of body.players) {
      if (typeof p.id !== 'string' || !p.id) {
        return err(400, 'Each player must have a non-empty string id');
      }
      if (typeof p.name !== 'string' || !p.name || p.name.length > MAX_NAME_LEN) {
        return err(400, `Each player name must be a non-empty string (max ${MAX_NAME_LEN} chars)`);
      }
      if (!Array.isArray(p.classes)) {
        return err(400, 'Each player must have a classes array');
      }
      for (const c of p.classes) {
        if (typeof c !== 'string') {
          return err(400, 'Class names must be strings');
        }
      }
    }

    if (!Array.isArray(body.history)) {
      return err(400, 'history must be an array');
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
      return err(500, 'Failed to save state');
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(state),
    };
  }

  return err(405, 'Method Not Allowed');
};
