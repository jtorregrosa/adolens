mod commands;

use commands::{
    ado::{clone_variable_group, get_projects, get_variable_group, get_variable_groups, update_variable_group},
    auth::{clear_credentials, load_credentials, save_credentials},
    preferences::{load_favorites, save_favorites},
};
use std::sync::Mutex;

// ─── Shared credential state ──────────────────────────────────────────────────
// Populated by save_credentials / load_credentials, consumed by every ADO command.
// Avoids re-reading the keychain on every API call and guarantees credentials
// are available immediately after login without a round-trip to disk.

#[derive(Clone)]
pub struct AppCredentials {
    /// Full URL as entered by the user, e.g. "https://dev.azure.com/myorg"
    pub org_url: String,
    /// Extracted org name passed to the SDK, e.g. "myorg"
    pub org_name: String,
    pub pat: String,
}

pub struct CredentialsState(pub Mutex<Option<AppCredentials>>);

/// Parse the org name out of any recognised ADO URL format.
/// Falls back to returning the input unchanged so on-premises URLs work too.
pub fn extract_org_name(org_url: &str) -> String {
    // https://dev.azure.com/orgname[/...]
    if let Some(rest) = org_url.strip_prefix("https://dev.azure.com/") {
        return rest.split('/').next().unwrap_or(rest).to_string();
    }
    // https://orgname.visualstudio.com (legacy)
    if let Some(rest) = org_url.strip_prefix("https://") {
        if rest.contains("visualstudio.com") {
            if let Some(org) = rest.split('.').next() {
                return org.to_string();
            }
        }
    }
    // Already just an org name, or an on-prem URL — return as-is
    org_url.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CredentialsState(Mutex::new(None)))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_credentials,
            load_credentials,
            clear_credentials,
            get_projects,
            get_variable_groups,
            get_variable_group,
            update_variable_group,
            clone_variable_group,
            load_favorites,
            save_favorites,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ADO Lens");
}
