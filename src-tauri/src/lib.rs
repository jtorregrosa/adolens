mod commands;

use azure_devops_rust_api::{core, distributed_task, Credential};
use commands::{
    ado::{clone_variable_group, get_projects, get_variable_group, get_variable_groups, update_variable_group},
    ai::{ai_chat, ai_check_gpu, ai_check_model, ai_check_ollama, ai_pull_model},
    auth::{clear_credentials, get_user_profile, load_credentials, save_credentials, set_request_timeout},
    preferences::{load_favorites, save_favorites},
};
use std::sync::{Arc, Mutex};

// ─── Credential state (raw auth data, used by auth commands) ─────────────────

#[derive(Clone)]
pub struct AppCredentials {
    /// Full URL as entered by the user, e.g. "https://dev.azure.com/myorg"
    pub org_url: String,
    /// Extracted org name passed to the SDK, e.g. "myorg"
    pub org_name: String,
    pub pat: String,
}

pub struct CredentialsState(pub Mutex<Option<AppCredentials>>);

// ─── Client cache (pre-built SDK clients, used by ado commands) ──────────────
// Rebuilt only when credentials change; wrapped in Arc so ado commands clone
// the Arc in microseconds without holding the Mutex across async calls.

pub struct CachedAdoClients {
    pub core: core::Client,
    pub distributed_task: distributed_task::Client,
    pub org_name: String,
    pub org_url: String,
}

pub struct ClientState(pub Mutex<Option<Arc<CachedAdoClients>>>);

// ─── Timeout state (seconds to wait on HTTP calls) ───────────────────────────

pub struct AppTimeoutState(pub Mutex<u64>);

impl ClientState {
    pub fn get(&self) -> Result<Arc<CachedAdoClients>, String> {
        self.0
            .lock()
            .expect("client lock poisoned")
            .clone()
            .ok_or_else(|| "Not authenticated".to_string())
    }
}

/// Build both SDK clients from a PAT and cache them in an Arc.
pub fn build_cached_clients(org_url: &str, org_name: &str, pat: &str) -> Arc<CachedAdoClients> {
    let credential = Credential::from_pat(pat.to_string());
    Arc::new(CachedAdoClients {
        core: core::ClientBuilder::new(credential.clone()).build(),
        distributed_task: distributed_task::ClientBuilder::new(credential).build(),
        org_name: org_name.to_string(),
        org_url: org_url.to_string(),
    })
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

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
        .manage(ClientState(Mutex::new(None)))
        .manage(AppTimeoutState(Mutex::new(15)))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_credentials,
            load_credentials,
            clear_credentials,
            get_user_profile,
            get_projects,
            get_variable_groups,
            get_variable_group,
            update_variable_group,
            clone_variable_group,
            load_favorites,
            save_favorites,
            set_request_timeout,
            ai_check_ollama,
            ai_check_model,
            ai_check_gpu,
            ai_pull_model,
            ai_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ADOLens");
}
