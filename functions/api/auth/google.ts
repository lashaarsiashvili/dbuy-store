// Cloudflare Pages Function: /api/auth/google
// Handles Google Sign-In with Database Verification, Automatic User Registration,
// Personal Data Space Isolation (user_profiles), and Active Session Token Generation.

interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
      all<T = any>(): Promise<{ results: T[] }>;
    };
    all<T = any>(): Promise<{ results: T[] }>;
    first<T = any>(colName?: string): Promise<T | null>;
    run(): Promise<any>;
  };
  exec(query: string): Promise<any>;
}

export interface Env {
  DB?: D1Database;
  STORE_KV?: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

async function ensureAuthTables(db: D1Database): Promise<void> {
  try {
    // 1. Main Users Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_id TEXT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        picture TEXT,
        role TEXT DEFAULT 'customer',
        provider TEXT DEFAULT 'google',
        session_token TEXT,
        country TEXT DEFAULT 'Georgia',
        city TEXT DEFAULT 'Tbilisi',
        zip TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Isolated Personal Profile & Data Space Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        cart TEXT DEFAULT '[]',
        wishlist TEXT DEFAULT '[]',
        preferences TEXT DEFAULT '{}',
        shipping_address TEXT DEFAULT '{}',
        orders_history TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. User Sessions Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Ensure store_kv exists for backward compatibility
    await db.exec(`
      CREATE TABLE IF NOT EXISTS store_kv (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (err) {
    console.warn('[ensureAuthTables warning]:', err);
  }
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json().catch(() => ({}));
    const { email, name, googleId, picture } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return jsonResponse({ success: false, error: 'Valid email is required' }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' ? name.trim() : '') || 'Google User';
    const cleanGoogleId = (googleId && typeof googleId === 'string' ? googleId.trim() : '') || '';
    const cleanPicture = (picture && typeof picture === 'string' ? picture.trim() : '') || '';

    const db = env.DB;
    let isNewUser = false;
    let resolvedUser: any = null;
    let profileData: any = { cart: [], wishlist: [], preferences: {}, shipping_address: {} };

    // Generate cryptographic-style session token
    const sessionToken = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    if (db) {
      await ensureAuthTables(db);

      // Check if user exists by google_id or email
      let existingUser: any = null;
      if (cleanGoogleId) {
        existingUser = await db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?')
          .bind(cleanGoogleId, cleanEmail)
          .first()
          .catch(() => null);
      } else {
        existingUser = await db.prepare('SELECT * FROM users WHERE email = ?')
          .bind(cleanEmail)
          .first()
          .catch(() => null);
      }

      if (!existingUser) {
        // --- NEW USER: Automatically insert into main admin database ---
        isNewUser = true;
        const newUserId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        const role = cleanEmail === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer';

        await db.prepare(`
          INSERT INTO users (
            id, google_id, email, name, picture, role, provider, session_token,
            country, city, zip, address, phone, created_at, last_login_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'google', ?, 'Georgia', 'Tbilisi', '', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(
          newUserId,
          cleanGoogleId || null,
          cleanEmail,
          cleanName,
          cleanPicture || null,
          role,
          sessionToken
        ).run().catch((err: any) => console.error('Error inserting new user:', err));

        // Create isolated personal data space in user_profiles
        await db.prepare(`
          INSERT OR REPLACE INTO user_profiles (
            user_id, email, cart, wishlist, preferences, shipping_address, orders_history, created_at, updated_at
          ) VALUES (?, ?, '[]', '[]', '{}', '{}', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(newUserId, cleanEmail).run().catch((err: any) => console.error('Error inserting user_profile:', err));

        resolvedUser = {
          id: newUserId,
          userId: newUserId,
          googleId: cleanGoogleId,
          email: cleanEmail,
          name: cleanName,
          picture: cleanPicture,
          role,
          provider: 'google',
          sessionToken,
          country: 'Georgia',
          city: 'Tbilisi',
          zip: '',
          address: '',
          phone: '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
      } else {
        // --- EXISTING USER: Update login time and authenticate with new session token ---
        isNewUser = false;
        const userId = existingUser.id;
        const role = cleanEmail === 'lashaarsiashvili@gmail.com' || existingUser.role === 'admin' ? 'admin' : 'customer';

        await db.prepare(`
          UPDATE users SET
            last_login_at = CURRENT_TIMESTAMP,
            session_token = ?,
            picture = COALESCE(?, picture),
            name = COALESCE(?, name),
            google_id = COALESCE(?, google_id)
          WHERE id = ?
        `).bind(
          sessionToken,
          cleanPicture || null,
          cleanName || null,
          cleanGoogleId || null,
          userId
        ).run().catch((err: any) => console.error('Error updating existing user:', err));

        // Ensure isolated personal space exists
        await db.prepare(`
          INSERT OR IGNORE INTO user_profiles (
            user_id, email, cart, wishlist, preferences, shipping_address, orders_history, created_at, updated_at
          ) VALUES (?, ?, '[]', '[]', '{}', '{}', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(userId, cleanEmail).run().catch(() => {});

        // Fetch their isolated data space
        const profileRow: any = await db.prepare('SELECT * FROM user_profiles WHERE user_id = ?')
          .bind(userId)
          .first()
          .catch(() => null);

        if (profileRow) {
          try { profileData.cart = JSON.parse(profileRow.cart || '[]'); } catch {}
          try { profileData.wishlist = JSON.parse(profileRow.wishlist || '[]'); } catch {}
          try { profileData.preferences = JSON.parse(profileRow.preferences || '{}'); } catch {}
          try { profileData.shipping_address = JSON.parse(profileRow.shipping_address || '{}'); } catch {}
        }

        resolvedUser = {
          id: userId,
          userId,
          googleId: cleanGoogleId || existingUser.google_id,
          email: cleanEmail,
          name: cleanName || existingUser.name,
          picture: cleanPicture || existingUser.picture,
          role,
          provider: 'google',
          sessionToken,
          country: existingUser.country || 'Georgia',
          city: existingUser.city || 'Tbilisi',
          zip: existingUser.zip || '',
          address: existingUser.address || '',
          phone: existingUser.phone || '',
          createdAt: existingUser.created_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
      }

      // Record active session
      await db.prepare(`
        INSERT INTO user_sessions (session_token, user_id, email, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now', '+30 days'), CURRENT_TIMESTAMP)
      `).bind(sessionToken, resolvedUser.id, cleanEmail).run().catch(() => {});

      // Synchronize with KV registered_users for admin panel view backward compatibility
      try {
        const kvRes = await db.prepare("SELECT value FROM store_kv WHERE key = 'registered_users'").first();
        const registeredUsers = kvRes ? JSON.parse((kvRes as any).value || '{}') : {};
        registeredUsers[cleanEmail] = {
          id: resolvedUser.id,
          userId: resolvedUser.id,
          googleId: resolvedUser.googleId,
          email: cleanEmail,
          name: resolvedUser.name,
          picture: resolvedUser.picture,
          role: resolvedUser.role,
          provider: 'google',
          authProvider: 'google',
          country: resolvedUser.country,
          city: resolvedUser.city,
          zip: resolvedUser.zip,
          address: resolvedUser.address,
          phone: resolvedUser.phone,
          createdAt: resolvedUser.createdAt,
          lastLoginAt: resolvedUser.lastLoginAt,
          sessionToken,
        };
        await db.prepare("INSERT OR REPLACE INTO store_kv (key, value) VALUES ('registered_users', ?)")
          .bind(JSON.stringify(registeredUsers))
          .run();
      } catch (kvErr) {
        console.warn('KV sync error:', kvErr);
      }
    } else {
      // Fallback if D1 is not attached
      const fallbackUserId = `usr_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`;
      resolvedUser = {
        id: fallbackUserId,
        userId: fallbackUserId,
        googleId: cleanGoogleId,
        email: cleanEmail,
        name: cleanName,
        picture: cleanPicture,
        role: cleanEmail === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer',
        provider: 'google',
        sessionToken,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }

    return jsonResponse({
      success: true,
      isNewUser,
      sessionToken,
      user: resolvedUser,
      profile: profileData,
    });
  } catch (err: any) {
    console.error('[/api/auth/google error]:', err);
    return jsonResponse({ success: false, error: err?.message || 'Authentication error' }, 500);
  }
};
