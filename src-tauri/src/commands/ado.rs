use azure_devops_rust_api::{core, distributed_task, Credential};
use azure_devops_rust_api::distributed_task::models::VariableGroupParameters;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

use crate::{AppCredentials, CredentialsState};

// ─── Frontend-facing output types ─────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdoProject {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AdoVariable {
    pub value: Option<String>,
    pub is_secret: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdoVariableGroup {
    pub id: u32,
    pub name: String,
    pub description: Option<String>,
    pub variable_count: usize,
    pub variables: HashMap<String, AdoVariable>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn get_creds(state: &State<'_, CredentialsState>) -> Result<AppCredentials, String> {
    state
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Not authenticated".to_string())
}

fn make_credential(pat: &str) -> Credential {
    Credential::from_pat(pat.to_string())
}

/// Convert the SDK's `variables: Option<Value>` field to our typed map.
fn parse_variables(vars: Option<&Value>) -> HashMap<String, AdoVariable> {
    let Some(Value::Object(map)) = vars else {
        return HashMap::new();
    };
    map.iter()
        .map(|(key, v)| {
            let var = AdoVariable {
                value: v.get("value").and_then(|v| v.as_str()).map(String::from),
                is_secret: v.get("isSecret").and_then(|v| v.as_bool()),
            };
            (key.clone(), var)
        })
        .collect()
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// List all projects in the organisation.
#[tauri::command]
pub async fn get_projects(state: State<'_, CredentialsState>) -> Result<Vec<AdoProject>, String> {
    let creds = get_creds(&state)?;
    let client = core::ClientBuilder::new(make_credential(&creds.pat)).build();

    let result = client
        .projects_client()
        .list(&creds.org_name)
        .top(500)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result
        .value
        .into_iter()
        .map(|p| AdoProject {
            id: p.id.unwrap_or_default(),
            name: p.name,
            description: p.description,
        })
        .collect())
}

/// List all variable groups for a project.
#[tauri::command]
pub async fn get_variable_groups(
    state: State<'_, CredentialsState>,
    project_id: String,
) -> Result<Vec<AdoVariableGroup>, String> {
    let creds = get_creds(&state)?;
    let client = distributed_task::ClientBuilder::new(make_credential(&creds.pat)).build();

    let result = client
        .variablegroups_client()
        .get_variable_groups(&creds.org_name, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    result
        .value
        .iter()
        .map(|g| sdk_group_to_output(g))
        .collect()
}

/// Get a single variable group by ID.
#[tauri::command]
pub async fn get_variable_group(
    state: State<'_, CredentialsState>,
    project_id: String,
    group_id: u32,
) -> Result<AdoVariableGroup, String> {
    let creds = get_creds(&state)?;
    let client = distributed_task::ClientBuilder::new(make_credential(&creds.pat)).build();

    let g = client
        .variablegroups_client()
        .get(&creds.org_name, &project_id, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    sdk_group_to_output(&g)
}

/// Update a variable group: fetch the existing group, patch the variables,
/// then PUT it back via VariableGroupParameters (preserves all ADO metadata).
#[tauri::command]
pub async fn update_variable_group(
    state: State<'_, CredentialsState>,
    project_id: String,
    group_id: u32,
    variables: HashMap<String, UpdateVariable>,
) -> Result<(), String> {
    let creds = get_creds(&state)?;
    let credential = make_credential(&creds.pat);
    let client = distributed_task::ClientBuilder::new(credential).build();

    // Fetch the existing group so we can copy its required metadata fields.
    let existing = client
        .variablegroups_client()
        .get(&creds.org_name, &project_id, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    // Build the updated variables JSON object.
    let updated_vars: serde_json::Map<String, Value> = variables
        .iter()
        .map(|(key, v)| {
            let entry = serde_json::json!({
                "value": if v.is_secret { Value::Null } else { Value::String(v.value.clone()) },
                "isSecret": v.is_secret
            });
            (key.clone(), entry)
        })
        .collect();

    let params = VariableGroupParameters {
        description: existing.description.clone(),
        name: existing.name.clone(),
        provider_data: None,
        type_: existing.type_.clone(),
        variable_group_project_references: existing.variable_group_project_references.clone(),
        variables: Some(Value::Object(updated_vars)),
    };

    client
        .variablegroups_client()
        .update(&creds.org_name, params, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Clone a variable group by creating a new one with the same variables
/// and a different name.
#[tauri::command]
pub async fn clone_variable_group(
    state: State<'_, CredentialsState>,
    project_id: String,
    group_id: u32,
    new_name: String,
) -> Result<AdoVariableGroup, String> {
    let creds = get_creds(&state)?;
    let credential = make_credential(&creds.pat);
    let client = distributed_task::ClientBuilder::new(credential).build();

    // Fetch the source group to copy its variables and metadata.
    let source = client
        .variablegroups_client()
        .get(&creds.org_name, &project_id, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    let params = VariableGroupParameters {
        name: Some(new_name),
        description: source.description.clone(),
        type_: source.type_.clone(),
        provider_data: None,
        variable_group_project_references: source.variable_group_project_references.clone(),
        variables: source.variables.clone(),
    };

    let created = client
        .variablegroups_client()
        .add(&creds.org_name, params)
        .await
        .map_err(|e| e.to_string())?;

    sdk_group_to_output(&created)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

fn sdk_group_to_output(
    g: &azure_devops_rust_api::distributed_task::models::VariableGroup,
) -> Result<AdoVariableGroup, String> {
    let id = g.id.ok_or_else(|| "Variable group missing id".to_string())? as u32;
    let name = g
        .name
        .clone()
        .ok_or_else(|| "Variable group missing name".to_string())?;

    let variables = parse_variables(g.variables.as_ref());
    let variable_count = variables.len();

    Ok(AdoVariableGroup {
        id,
        name,
        description: g.description.clone(),
        variable_count,
        variables,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVariable {
    pub value: String,
    pub is_secret: bool,
}
