use azure_devops_rust_api::distributed_task::models::{
    ProjectReference, VariableGroupParameters, VariableGroupProjectReference,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

use crate::{CachedAdoClients, ClientState};

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

/// Shallow reference for a project linked to a variable group (shared library).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdoVariableGroupProjectRef {
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdoVariableGroup {
    pub id: u32,
    pub name: String,
    pub description: Option<String>,
    pub variable_count: usize,
    pub variables: HashMap<String, AdoVariable>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub type_: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_by_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_shared: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variable_group_project_references: Option<Vec<AdoVariableGroupProjectRef>>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Clone the cached Arc — acquires the Mutex only for the duration of the clone,
/// so the lock is never held across an async .await boundary.
fn get_clients(state: &State<'_, ClientState>) -> Result<Arc<CachedAdoClients>, String> {
    state.get().map_err(|e| e.to_string())
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
pub async fn get_projects(state: State<'_, ClientState>) -> Result<Vec<AdoProject>, String> {
    let clients = get_clients(&state)?;

    let result = clients
        .core
        .projects_client()
        .list(&clients.org_name)
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
    state: State<'_, ClientState>,
    project_id: String,
) -> Result<Vec<AdoVariableGroup>, String> {
    let clients = get_clients(&state)?;

    let result = clients
        .distributed_task
        .variablegroups_client()
        .get_variable_groups(&clients.org_name, &project_id)
        .await
        .map_err(|e| e.to_string())?;

    result.value.iter().map(sdk_group_to_output).collect()
}

/// Get a single variable group by ID.
#[tauri::command]
pub async fn get_variable_group(
    state: State<'_, ClientState>,
    project_id: String,
    group_id: u32,
) -> Result<AdoVariableGroup, String> {
    let clients = get_clients(&state)?;

    let g = clients
        .distributed_task
        .variablegroups_client()
        .get(&clients.org_name, &project_id, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    sdk_group_to_output(&g)
}

/// Update a variable group: fetch the existing group, patch the variables,
/// then PUT it back via VariableGroupParameters (preserves all ADO metadata).
#[tauri::command]
pub async fn update_variable_group(
    state: State<'_, ClientState>,
    project_id: String,
    group_id: u32,
    variables: HashMap<String, UpdateVariable>,
) -> Result<(), String> {
    let clients = get_clients(&state)?;

    // Fetch the existing group so we can copy its required metadata fields.
    let existing = clients
        .distributed_task
        .variablegroups_client()
        .get(&clients.org_name, &project_id, group_id as i32)
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

    clients
        .distributed_task
        .variablegroups_client()
        .update(&clients.org_name, params, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Clone a variable group by creating a new one with the same variables
/// and a different name.
#[tauri::command]
pub async fn clone_variable_group(
    state: State<'_, ClientState>,
    project_id: String,
    group_id: u32,
    new_name: String,
) -> Result<AdoVariableGroup, String> {
    let clients = get_clients(&state)?;

    // Fetch the source group to copy its variables and metadata.
    let source = clients
        .distributed_task
        .variablegroups_client()
        .get(&clients.org_name, &project_id, group_id as i32)
        .await
        .map_err(|e| e.to_string())?;

    // Build new project references with the *new* group name. Copying the source's
    // variable_group_project_references as-is would send the *original* group name
    // in each reference, which can cause the API to return "already exists" even when
    // the top-level name is new (the API may use the reference name for uniqueness).
    let variable_group_project_references: Vec<VariableGroupProjectReference> = {
        let mapped: Vec<_> = source
            .variable_group_project_references
            .iter()
            .map(|r| VariableGroupProjectReference {
                name: Some(new_name.clone()),
                description: r.description.clone(),
                project_reference: r.project_reference.clone(),
            })
            .collect();
        if mapped.is_empty() {
            vec![VariableGroupProjectReference {
                name: Some(new_name.clone()),
                description: source.description.clone(),
                project_reference: Some(ProjectReference {
                    id: Some(project_id.clone()),
                    name: None,
                }),
            }]
        } else {
            mapped
        }
    };

    let params = VariableGroupParameters {
        name: Some(new_name),
        description: source.description.clone(),
        type_: source.type_.clone(),
        provider_data: None,
        variable_group_project_references,
        variables: source.variables.clone(),
    };

    let created = clients
        .distributed_task
        .variablegroups_client()
        .add(&clients.org_name, params)
        .await
        .map_err(|e| e.to_string())?;

    sdk_group_to_output(&created)
}

/// Create a new empty variable group (library) in a project.
#[tauri::command]
pub async fn add_variable_group(
    state: State<'_, ClientState>,
    project_id: String,
    name: String,
    description: Option<String>,
) -> Result<AdoVariableGroup, String> {
    let clients = get_clients(&state)?;

    let variable_group_project_references = vec![VariableGroupProjectReference {
        name: Some(name.clone()),
        description: description.clone(),
        project_reference: Some(ProjectReference {
            id: Some(project_id.clone()),
            name: None,
        }),
    }];

    // Azure DevOps API requires at least one variable to create a library.
    // Include a dummy variable that can be deleted by the user later.
    let params = VariableGroupParameters {
        name: Some(name),
        description,
        type_: None,
        provider_data: None,
        variable_group_project_references,
        variables: Some(serde_json::json!({
            "dummy": {
                "value": "",
                "isSecret": false
            }
        })),
    };

    let created = clients
        .distributed_task
        .variablegroups_client()
        .add(&clients.org_name, params)
        .await
        .map_err(|e| e.to_string())?;

    sdk_group_to_output(&created)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

fn identity_display_name(
    ref_: Option<&azure_devops_rust_api::distributed_task::models::IdentityRef>,
) -> Option<String> {
    ref_.and_then(|r| r.graph_subject_base.display_name.clone())
}

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

    let created_on = g
        .created_on
        .as_ref()
        .map(|t| t.to_string());
    let modified_on = g
        .modified_on
        .as_ref()
        .map(|t| t.to_string());

    let variable_group_project_references: Option<Vec<AdoVariableGroupProjectRef>> =
        if g.variable_group_project_references.is_empty() {
            None
        } else {
            Some(
                g.variable_group_project_references
                    .iter()
                    .map(|r| AdoVariableGroupProjectRef {
                        project_id: r
                            .project_reference
                            .as_ref()
                            .and_then(|p| p.id.clone()),
                        project_name: r
                            .project_reference
                            .as_ref()
                            .and_then(|p| p.name.clone()),
                        name: r.name.clone(),
                        description: r.description.clone(),
                    })
                    .collect(),
            )
        };

    Ok(AdoVariableGroup {
        id,
        name,
        description: g.description.clone(),
        variable_count,
        variables,
        type_: g.type_.clone(),
        created_on,
        modified_on,
        created_by: identity_display_name(g.created_by.as_ref()),
        created_by_image_url: g.created_by.as_ref().and_then(|c| c.image_url.clone()),
        modified_by: identity_display_name(g.modified_by.as_ref()),
        modified_by_image_url: g.modified_by.as_ref().and_then(|c| c.image_url.clone()),
        is_shared: g.is_shared,
        variable_group_project_references,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVariable {
    pub value: String,
    pub is_secret: bool,
}
