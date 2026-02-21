import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Publisher, SummarizedUpdate, PublishConfig } from "./types.js";
import { formatUpdatesAsMarkdown } from "./format.js";

// OAuth 2.0 scopes for Google Drive
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const DRIVE_FILENAME = "ai-watch-latest";
const GOOGLE_DOCS_MIME = "application/vnd.google-apps.document";

interface OAuthClientConfig {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

interface DriveConfig {
  folder_id: string;
}

function getConfigDir(config: PublishConfig): string {
  return config.driveCredentialsDir || join(import.meta.dirname, "../..");
}

function loadDriveConfig(configDir: string): DriveConfig {
  const configPath = join(configDir, ".gdrive-config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      `Google Drive config not found: ${configPath}\n` +
        'Create it with: {"folder_id": "YOUR_FOLDER_ID"}\n' +
        "Get folder ID from the Drive folder URL.",
    );
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function loadOAuthClient(configDir: string): OAuthClientConfig {
  const clientPath = join(configDir, ".gdrive-oauth-client.json");
  if (!existsSync(clientPath)) {
    throw new Error(
      `OAuth client file not found: ${clientPath}\n\n` +
        "Setup:\n" +
        "  1. Google Cloud Console → APIs & Services → Credentials\n" +
        '  2. Create Credentials → OAuth client ID → Desktop app\n' +
        `  3. Download JSON → save as ${clientPath}`,
    );
  }
  return JSON.parse(readFileSync(clientPath, "utf-8"));
}

function getClientCredentials(clientConfig: OAuthClientConfig) {
  const installed = clientConfig.installed || clientConfig.web;
  if (!installed) {
    throw new Error("Invalid OAuth client config: missing 'installed' or 'web' key");
  }
  return installed;
}

async function loadOrRefreshTokens(configDir: string, clientConfig: OAuthClientConfig): Promise<string> {
  const tokenPath = join(configDir, ".gdrive-oauth-token.json");
  const creds = getClientCredentials(clientConfig);

  if (existsSync(tokenPath)) {
    const tokens: OAuthTokens = JSON.parse(readFileSync(tokenPath, "utf-8"));

    // トークンが有効期限内ならそのまま使う
    if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60_000) {
      return tokens.access_token;
    }

    // リフレッシュトークンでアクセストークンを更新
    if (tokens.refresh_token) {
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { access_token: string; expires_in: number };
        const updated: OAuthTokens = {
          ...tokens,
          access_token: data.access_token,
          expiry_date: Date.now() + data.expires_in * 1000,
        };
        writeFileSync(tokenPath, JSON.stringify(updated, null, 2), "utf-8");
        return updated.access_token;
      }
    }
  }

  // 初回認証フロー（ブラウザベース）
  return await runOAuthFlow(configDir, creds);
}

async function runOAuthFlow(
  configDir: string,
  creds: { client_id: string; client_secret: string; redirect_uris: string[] },
): Promise<string> {
  const redirectUri = "http://localhost:8085";
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(creds.client_id)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log("  [google-drive] Opening browser for OAuth authentication...");
  console.log(`  [google-drive] If browser doesn't open, visit: ${authUrl}`);

  // ブラウザを開く
  const { exec } = await import("node:child_process");
  exec(`open "${authUrl}"`);

  // ローカルサーバーでコールバックを受け取る
  const code = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("OAuth timeout (120s)")), 120_000);

    const server = Bun.serve({
      port: 8085,
      fetch(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        if (code) {
          clearTimeout(timeout);
          setTimeout(() => server.stop(), 500);
          resolve(code);
          return new Response(
            "<html><body><h2>Authentication successful!</h2><p>You can close this window.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }
        return new Response("Waiting for auth...", { status: 200 });
      },
    });
  });

  // code → tokens
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OAuth token exchange failed: ${text}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const tokens: OAuthTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expiry_date: Date.now() + data.expires_in * 1000,
  };

  const tokenPath = join(configDir, ".gdrive-oauth-token.json");
  writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), "utf-8");
  console.log(`  [google-drive] Token saved to ${tokenPath}`);

  return tokens.access_token;
}

async function findExistingFile(
  accessToken: string,
  folderId: string,
  filename: string,
): Promise<string | null> {
  const query = `name = '${filename}' and '${folderId}' in parents and trashed = false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!resp.ok) {
    throw new Error(`Drive API files.list failed: ${resp.status} ${await resp.text()}`);
  }

  const data = (await resp.json()) as { files: Array<{ id: string }> };
  return data.files[0]?.id ?? null;
}

async function uploadOrUpdate(
  accessToken: string,
  folderId: string,
  content: string,
  filename: string,
): Promise<void> {
  const existingId = await findExistingFile(accessToken, folderId, filename);

  if (existingId) {
    // 上書き更新
    const resp = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: content,
      },
    );
    if (!resp.ok) {
      throw new Error(`Drive API files.update failed: ${resp.status} ${await resp.text()}`);
    }
    console.log(`  [google-drive] Updated: ${filename} (id: ${existingId})`);
  } else {
    // 新規作成（Google Docs 形式）
    const metadata = {
      name: filename,
      parents: [folderId],
      mimeType: GOOGLE_DOCS_MIME,
    };

    // multipart upload
    const boundary = "ai_watch_boundary";
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const resp = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!resp.ok) {
      throw new Error(`Drive API files.create failed: ${resp.status} ${await resp.text()}`);
    }
    const data = (await resp.json()) as { id: string };
    console.log(`  [google-drive] Created: ${filename} (id: ${data.id})`);
  }
}

export const googleDrivePublisher: Publisher = {
  name: "google-drive",

  async publish(updates: SummarizedUpdate[], config: PublishConfig): Promise<void> {
    const configDir = getConfigDir(config);

    let driveConfig: DriveConfig;
    try {
      driveConfig = loadDriveConfig(configDir);
    } catch (err) {
      console.warn(`  [google-drive] ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    let clientConfig: OAuthClientConfig;
    try {
      clientConfig = loadOAuthClient(configDir);
    } catch (err) {
      console.warn(`  [google-drive] ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const accessToken = await loadOrRefreshTokens(configDir, clientConfig);
    const markdown = formatUpdatesAsMarkdown(updates);

    await uploadOrUpdate(accessToken, driveConfig.folder_id, markdown, DRIVE_FILENAME);
  },
};
