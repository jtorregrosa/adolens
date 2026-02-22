use keyring::Entry;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

use crate::{AppCredentials, ClientState, CredentialsState, build_cached_clients, extract_org_name};

const KEYRING_SERVICE: &str = "ADOLens";
const KEYRING_USER: &str = "pat";
const STORE_FILE: &str = "config.json";
const ORG_URL_KEY: &str = "orgUrl";

/// Save credentials: populate managed state and SDK client cache, then persist
/// orgUrl to the app store and PAT to the OS keychain.
#[tauri::command]
pub async fn save_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
    client_state: State<'_, ClientState>,
    org_url: String,
    pat: String,
) -> Result<(), String> {
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

    // Persist orgUrl to store.
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(ORG_URL_KEY, serde_json::Value::String(org_url));
    store.save().map_err(|e| e.to_string())?;

    // Persist PAT to OS keychain.
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    entry.set_password(&pat).map_err(|e| e.to_string())?;

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
