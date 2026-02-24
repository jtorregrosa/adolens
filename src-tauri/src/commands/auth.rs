use base64::Engine as _;
use keyring::Entry;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

use crate::{AppCredentials, AppTimeoutState, ClientState, CredentialsState, build_cached_clients, extract_org_name};
use crate::validation::validate_org_url;

fn minimal_profile(org_name: String) -> UserProfile {
    UserProfile { display_name: String::new(), email: String::new(), avatar_data_url: None, org_name }
}

const VSSPS_BASE: &str = "https://app.vssps.visualstudio.com";

const KEYRING_SERVICE: &str = "ADOLens";
const KEYRING_USER: &str = "pat";
const STORE_FILE: &str = "config.json";
const ORG_URL_KEY: &str = "orgUrl";

/// Save credentials: populate managed state and SDK client cache.
/// When `remember` is true, also persist orgUrl to the app store and PAT to
/// the OS keychain so they survive app restarts. When false, credentials are
/// kept only in memory for the current session.
#[tauri::command]
pub async fn save_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
    client_state: State<'_, ClientState>,
    org_url: String,
    pat: String,
    remember: bool,
) -> Result<(), String> {
    validate_org_url(&org_url).map_err(|e| e.to_string())?;

    let org_name = extract_org_name(&org_url);

    // Populate credential state for auth commands.
    {
        let mut lock = state.0.lock().expect("credentials lock poisoned");
        *lock = Some(AppCredentials {
            org_url: org_url.clone(),
            org_name: org_name.clone(),
            pat: pat.clone(),
        });
    }

    // Build and cache SDK clients so ado commands reuse the connection pool.
    {
        let mut lock = client_state.0.lock().expect("client lock poisoned");
        *lock = Some(build_cached_clients(&org_url, &org_name, &pat));
    }

    if remember {
        // Persist orgUrl to store.
        let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
        store.set(ORG_URL_KEY, serde_json::Value::String(org_url));
        store.save().map_err(|e| e.to_string())?;

        // Persist PAT to OS keychain.
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
        entry.set_password(&pat).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Load persisted credentials, populate managed state and SDK client cache,
/// and return only the orgUrl to the frontend (PAT stays in Rust memory).
#[tauri::command]
pub async fn load_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
    client_state: State<'_, ClientState>,
) -> Result<CredentialsPayload, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let org_url = store
        .get(ORG_URL_KEY)
        .and_then(|v| v.as_str().map(String::from))
        .ok_or_else(|| "No credentials stored".to_string())?;

    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    let pat = entry
        .get_password()
        .map_err(|_| "No credentials stored".to_string())?;

    let org_name = extract_org_name(&org_url);

    // Populate credential state.
    {
        let mut lock = state.0.lock().expect("credentials lock poisoned");
        *lock = Some(AppCredentials {
            org_url: org_url.clone(),
            org_name: org_name.clone(),
            pat: pat.clone(),
        });
    }

    // Build and cache SDK clients.
    {
        let mut lock = client_state.0.lock().expect("client lock poisoned");
        *lock = Some(build_cached_clients(&org_url, &org_name, &pat));
    }

    // Return only orgUrl — the PAT never leaves the Rust process.
    Ok(CredentialsPayload { org_url })
}

/// Clear all stored credentials from memory, SDK client cache, store, and keychain.
#[tauri::command]
pub async fn clear_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
    client_state: State<'_, ClientState>,
) -> Result<(), String> {
    {
        let mut lock = state.0.lock().expect("credentials lock poisoned");
        *lock = None;
    }
    {
        let mut lock = client_state.0.lock().expect("client lock poisoned");
        *lock = None;
    }

    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.delete(ORG_URL_KEY);
    store.save().map_err(|e| e.to_string())?;

    if let Ok(entry) = Entry::new(KEYRING_SERVICE, KEYRING_USER) {
        let _ = entry.delete_credential();
    }

    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialsPayload {
    /// Only the org URL is sent to the frontend; the PAT stays in Rust memory.
    pub org_url: String,
}

// ─── User profile ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub display_name: String,
    pub email: String,
    /// Base64 data URL (e.g. "data:image/png;base64,…"), or None if unavailable.
    pub avatar_data_url: Option<String>,
    pub org_name: String,
}

/// Fetch the authenticated user's profile.
///
/// Strategy:
///   1. Try `app.vssps.visualstudio.com/_apis/profile/profiles/me` — returns
///      displayName, email, and a profile ID usable for the avatar.
///      Requires the `vso.profile` PAT scope; 401s if the scope is absent.
///   2. Fall back to `{orgUrl}/_apis/connectionData` — works with *any* valid
///      PAT, returns the display name via `authenticatedUser.providerDisplayName`.
///
/// This command never returns an Err; the UI always gets at least the org name.
#[tauri::command]
pub async fn get_user_profile(
    state: State<'_, CredentialsState>,
    timeout_state: State<'_, AppTimeoutState>,
) -> Result<UserProfile, String> {
    let (org_name, org_url, pat) = {
        let lock = state.0.lock().expect("credentials lock poisoned");
        let creds = lock.as_ref().ok_or_else(|| "Not authenticated".to_string())?;
        (creds.org_name.clone(), creds.org_url.clone(), creds.pat.clone())
    };

    let timeout_secs = *timeout_state.0.lock().expect("timeout lock poisoned");
    let auth = base64::engine::general_purpose::STANDARD.encode(format!(":{pat}"));
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .unwrap_or_default();

    // ── 1. VSSPS Profile API (requires vso.profile scope) ─────────────────────
    let profile_url = format!("{VSSPS_BASE}/_apis/profile/profiles/me?api-version=7.1");
    if let Ok(resp) = http
        .get(&profile_url)
        .header("Authorization", format!("Basic {auth}"))
        .header("Accept", "application/json")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let display_name = json["displayName"].as_str().unwrap_or_default().to_string();
                let email = json["emailAddress"].as_str().unwrap_or_default().to_string();
                let profile_id = json["id"].as_str().unwrap_or_default().to_string();
                let avatar_data_url = fetch_avatar_as_data_url(&http, &auth, &profile_id).await;
                return Ok(UserProfile { display_name, email, avatar_data_url, org_name });
            }
        }
    }

    // ── 2. connectionData fallback (works with any valid PAT) ─────────────────
    let conn_url = format!("{org_url}/_apis/connectionData");
    match http
        .get(&conn_url)
        .header("Authorization", format!("Basic {auth}"))
        .header("Accept", "application/json")
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let display_name = json["authenticatedUser"]["providerDisplayName"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string();
                // Use the org-scoped identity image endpoint — it accepts the
                // identity ID that connectionData returns (different from the
                // VSSPS profile ID used by fetch_avatar_as_data_url).
                let user_id = json["authenticatedUser"]["id"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string();
                let avatar_data_url =
                    fetch_identity_avatar(&http, &auth, &org_url, &user_id).await;
                Ok(UserProfile { display_name, email: String::new(), avatar_data_url, org_name })
            } else {
                Ok(minimal_profile(org_name))
            }
        }
        Ok(r) => {
            eprintln!("[ADOLens] connectionData returned HTTP {}", r.status());
            Ok(minimal_profile(org_name))
        }
        Err(e) => {
            eprintln!("[ADOLens] connectionData request failed: {e}");
            Ok(minimal_profile(org_name))
        }
    }
}

/// Download the avatar for `profile_id` using the shared http client and the
/// pre-encoded Basic-auth header, then return it as a base64 data URL.
async fn fetch_avatar_as_data_url(
    http: &reqwest::Client,
    auth: &str,
    profile_id: &str,
) -> Option<String> {
    if profile_id.is_empty() {
        return None;
    }

    let url = format!("{VSSPS_BASE}/_apis/avatar/{profile_id}?size=medium");
    let resp = http
        .get(&url)
        .header("Authorization", format!("Basic {auth}"))
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .split(';')
        .next()
        .unwrap_or("image/png")
        .to_string();

    let bytes = resp.bytes().await.ok()?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:{content_type};base64,{encoded}"))
}

/// Update the runtime request timeout (in seconds).
/// Called by the frontend when the user changes the timeout in Settings.
#[tauri::command]
pub async fn set_request_timeout(
    timeout_state: State<'_, AppTimeoutState>,
    secs: u64,
) -> Result<(), String> {
    let clamped = secs.clamp(5, 120);
    *timeout_state.0.lock().map_err(|e| e.to_string())? = clamped;
    Ok(())
}

/// Fetch the identity avatar using the org-scoped `_api/_common/identityImage`
/// endpoint. This accepts the identity ID returned by `connectionData`
/// (which differs from the VSSPS profile ID used by `fetch_avatar_as_data_url`).
async fn fetch_identity_avatar(
    http: &reqwest::Client,
    auth: &str,
    org_url: &str,
    identity_id: &str,
) -> Option<String> {
    if identity_id.is_empty() {
        return None;
    }

    let url = format!("{org_url}/_api/_common/identityImage?id={identity_id}");
    let resp = http
        .get(&url)
        .header("Authorization", format!("Basic {auth}"))
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .split(';')
        .next()
        .unwrap_or("image/png")
        .to_string();

    // Skip non-image responses (e.g. HTML error pages).
    if !content_type.starts_with("image/") {
        return None;
    }

    let bytes = resp.bytes().await.ok()?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:{content_type};base64,{encoded}"))
}
