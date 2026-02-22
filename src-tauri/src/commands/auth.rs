use keyring::Entry;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

use crate::{AppCredentials, CredentialsState, extract_org_name};

const KEYRING_SERVICE: &str = "ado-lens";
const KEYRING_USER: &str = "pat";
const STORE_FILE: &str = "config.json";
const ORG_URL_KEY: &str = "orgUrl";

/// Save credentials: store in managed state for the session,
/// persist orgUrl to the app store and PAT to the OS keychain.
#[tauri::command]
pub async fn save_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
    org_url: String,
    pat: String,
) -> Result<(), String> {
    let org_name = extract_org_name(&org_url);

    // Put in memory immediately so subsequent commands work without disk I/O.
    {
        let mut lock = state.0.lock().unwrap();
        *lock = Some(AppCredentials {
            org_url: org_url.clone(),
            org_name,
            pat: pat.clone(),
        });
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

/// Load persisted credentials, populate managed state, and return them to
/// the frontend so it can restore its auth context on startup.
#[tauri::command]
pub async fn load_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
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

    // Populate state so ADO commands work immediately without re-reading.
    {
        let mut lock = state.0.lock().unwrap();
        *lock = Some(AppCredentials {
            org_url: org_url.clone(),
            org_name,
            pat: pat.clone(),
        });
    }

    Ok(CredentialsPayload { org_url, pat })
}

/// Clear all stored credentials from memory, store, and keychain.
#[tauri::command]
pub async fn clear_credentials(
    app: AppHandle,
    state: State<'_, CredentialsState>,
) -> Result<(), String> {
    {
        let mut lock = state.0.lock().unwrap();
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
    pub org_url: String,
    pub pat: String,
}
