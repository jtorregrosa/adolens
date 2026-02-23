use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{Emitter, State};

use crate::{CachedAdoClients, ClientState};

const OLLAMA_URL: &str = "http://127.0.0.1:11434";

// ─── Ollama message types ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCall {
    pub function: ToolFunction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolFunction {
    pub name: String,
    pub arguments: Value,
}

// ─── Ollama non-streaming response wrapper ─────────────────────────────────

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    pub message: ChatMessage,
}

// ─── Tauri event payloads ──────────────────────────────────────────────────

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiToolCallEvent {
    pub tool_name: String,
    pub args: Value,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPullProgressEvent {
    pub status: String,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

// ─── Tool definitions ──────────────────────────────────────────────────────

fn tool_definitions() -> Value {
    serde_json::json!([
        {
            "type": "function",
            "function": {
                "name": "list_projects",
                "description": "List all Azure DevOps projects in the organisation. Call this first when you need to discover which project a variable group (library) belongs to.",
                "parameters": { "type": "object", "properties": {}, "required": [] }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "list_variable_groups",
                "description": "List all variable group names and IDs in a given Azure DevOps project. Use this to discover available libraries before fetching their variable contents.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "string",
                            "description": "Azure DevOps project ID obtained from list_projects"
                        }
                    },
                    "required": ["project_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_variable_group",
                "description": "Fetch all variable key-value pairs from a specific variable group. Secret variable values are shown as [secret] and their real content is never accessible.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "string",
                            "description": "Azure DevOps project ID"
                        },
                        "group_id": {
                            "type": "integer",
                            "description": "Variable group ID obtained from list_variable_groups"
                        }
                    },
                    "required": ["project_id", "group_id"]
                }
            }
        }
    ])
}

// ─── Read-only ADO client facade ───────────────────────────────────────────
//
// This struct is the *only* way the AI agentic loop touches Azure DevOps.
// It intentionally exposes nothing but GET operations; the underlying SDK
// clients that can update, add, clone, or delete data are never reachable
// from `execute_tool`. The guarantee is structural, not just conventional —
// `execute_tool` receives a `&ReadOnlyAdoClients`, so the Rust type system
// prevents any call to mutating SDK methods at compile time.

struct ReadOnlyAdoClients(Arc<CachedAdoClients>);

impl ReadOnlyAdoClients {
    fn new(inner: Arc<CachedAdoClients>) -> Self {
        Self(inner)
    }

    /// GET /projects — lists all projects in the organisation.
    async fn list_projects(&self) -> Result<Vec<Value>, String> {
        let result = self
            .0
            .core
            .projects_client()
            .list(&self.0.org_name)
            .top(500)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result
            .value
            .into_iter()
            .map(|p| serde_json::json!({ "id": p.id.unwrap_or_default(), "name": p.name }))
            .collect())
    }

    /// GET /distributedtask/variablegroups — lists group names and IDs only
    /// (no variable values are returned here).
    async fn list_variable_groups(&self, project_id: &str) -> Result<Vec<Value>, String> {
        let result = self
            .0
            .distributed_task
            .variablegroups_client()
            .get_variable_groups(&self.0.org_name, project_id)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result
            .value
            .iter()
            .filter_map(|g| {
                let id = g.id?;
                let name = g.name.clone()?;
                let count = g
                    .variables
                    .as_ref()
                    .and_then(|v| v.as_object())
                    .map(|m| m.len())
                    .unwrap_or(0);
                Some(serde_json::json!({ "id": id, "name": name, "variable_count": count }))
            })
            .collect())
    }

    /// GET /distributedtask/variablegroups/{groupId} — fetches one group,
    /// masking every secret variable so no sensitive value is ever passed to
    /// the language model. ADO already returns `null` for secret values at the
    /// API level; the `[secret]` substitution here is an additional safeguard.
    async fn get_variable_group(
        &self,
        project_id: &str,
        group_id: i32,
    ) -> Result<Value, String> {
        let g = self
            .0
            .distributed_task
            .variablegroups_client()
            .get(&self.0.org_name, project_id, group_id)
            .await
            .map_err(|e| e.to_string())?;

        let name = g.name.clone().unwrap_or_default();

        let variables: serde_json::Map<String, Value> = match &g.variables {
            Some(Value::Object(map)) => map
                .iter()
                .map(|(key, v)| {
                    let is_secret = v
                        .get("isSecret")
                        .and_then(|b| b.as_bool())
                        .unwrap_or(false);
                    let display_value = if is_secret {
                        "[secret]".to_string()
                    } else {
                        v.get("value")
                            .and_then(|vv| vv.as_str())
                            .unwrap_or("")
                            .to_string()
                    };
                    (key.clone(), Value::String(display_value))
                })
                .collect(),
            _ => serde_json::Map::new(),
        };

        Ok(serde_json::json!({ "name": name, "variables": variables }))
    }
}

// ─── Tool execution ────────────────────────────────────────────────────────
//
// Accepts only `ReadOnlyAdoClients` — write operations are structurally
// unreachable. Any tool name not in the exhaustive match is rejected with an
// explicit error so unknown names from a misbehaving model never silently
// fall through to some default behaviour.

async fn execute_tool(
    clients: &ReadOnlyAdoClients,
    call: &ToolCall,
) -> Result<String, String> {
    let args = &call.function.arguments;

    match call.function.name.as_str() {
        "list_projects" => {
            let projects = clients.list_projects().await?;
            Ok(serde_json::to_string(&projects).unwrap())
        }

        "list_variable_groups" => {
            let project_id = args["project_id"]
                .as_str()
                .ok_or("Missing argument: project_id")?;
            let groups = clients.list_variable_groups(project_id).await?;
            Ok(serde_json::to_string(&groups).unwrap())
        }

        "get_variable_group" => {
            let project_id = args["project_id"]
                .as_str()
                .ok_or("Missing argument: project_id")?;
            let group_id = args["group_id"]
                .as_i64()
                .ok_or("Missing argument: group_id")? as i32;
            let group = clients.get_variable_group(project_id, group_id).await?;
            Ok(serde_json::to_string(&group).unwrap())
        }

        // Any name the model hallucinates or that isn't in tool_definitions()
        // is explicitly rejected — no write path exists to fall through to.
        name => Err(format!(
            "Tool '{name}' is not available. Only read-only tools are permitted: \
             list_projects, list_variable_groups, get_variable_group."
        )),
    }
}

// ─── Tauri commands ────────────────────────────────────────────────────────

/// Returns true if Ollama is reachable on localhost.
#[tauri::command]
pub async fn ai_check_ollama() -> bool {
    reqwest::Client::new()
        .get(format!("{OLLAMA_URL}/api/tags"))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Returns true if the given model is already downloaded in Ollama.
#[tauri::command]
pub async fn ai_check_model(model: String) -> Result<bool, String> {
    #[derive(Deserialize)]
    struct TagsResponse {
        models: Vec<ModelEntry>,
    }
    #[derive(Deserialize)]
    struct ModelEntry {
        name: String,
    }

    let resp = reqwest::Client::new()
        .get(format!("{OLLAMA_URL}/api/tags"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TagsResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Ollama normalises tag-less names to "name:latest"
    let target_latest = if model.contains(':') {
        model.clone()
    } else {
        format!("{model}:latest")
    };

    Ok(resp
        .models
        .iter()
        .any(|m| m.name == model || m.name == target_latest))
}

/// Pull (download) a model from Ollama. Emits "ai:pull-progress" events so
/// the UI can render a live progress bar.
#[tauri::command]
pub async fn ai_pull_model(app: tauri::AppHandle, model: String) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .post(format!("{OLLAMA_URL}/api/pull"))
        .json(&serde_json::json!({ "name": model, "stream": true }))
        .send()
        .await
        .map_err(|e| format!("Cannot reach Ollama: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama returned status {}", resp.status()));
    }

    let mut stream = resp.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        // Ollama streams NDJSON — process every complete line
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].to_string();
            buf.drain(..=pos);

            if line.trim().is_empty() {
                continue;
            }

            if let Ok(val) = serde_json::from_str::<Value>(&line) {
                let status = val["status"].as_str().unwrap_or("").to_string();
                let total = val["total"].as_u64();
                let completed = val["completed"].as_u64();

                let _ = app.emit(
                    "ai:pull-progress",
                    AiPullProgressEvent {
                        status: status.clone(),
                        total,
                        completed,
                    },
                );

                if status == "success" {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

const SYSTEM_PROMPT: &str =
    "You are ADOLens Assistant, a read-only expert on Azure DevOps variable groups (libraries). \
You have READ-ONLY access to Azure DevOps. You can only look up data — you cannot create, \
update, rename, delete, or modify anything. Never suggest, attempt, or imply any write operation. \
Use the available tools to look up projects and variable groups to answer questions accurately. \
Never guess variable values — always fetch them with tools first. \
Secret variable values are masked as [secret] by the system; never claim to know their actual content. \
Be concise and factual. Format lists using markdown bullet points.";

/// Execute one chat turn through the full agentic loop. Calls tools as needed
/// and emits "ai:tool-call" events for each tool invocation so the UI can
/// display live progress. Returns the final assistant message once the model
/// produces a plain-text response with no remaining tool calls.
#[tauri::command]
pub async fn ai_chat(
    app: tauri::AppHandle,
    state: State<'_, ClientState>,
    messages: Vec<ChatMessage>,
    model: String,
) -> Result<ChatMessage, String> {
    // Wrap in the read-only facade — execute_tool can never reach write methods.
    let clients = ReadOnlyAdoClients::new(state.get()?);
    let http = reqwest::Client::new();

    let mut history: Vec<Value> = std::iter::once(serde_json::json!({
        "role": "system",
        "content": SYSTEM_PROMPT
    }))
    .chain(messages.iter().map(|m| serde_json::to_value(m).unwrap()))
    .collect();

    for _ in 0..10 {
        let resp = http
            .post(format!("{OLLAMA_URL}/api/chat"))
            .json(&serde_json::json!({
                "model": model,
                "messages": history,
                "tools": tool_definitions(),
                "stream": false
            }))
            .send()
            .await
            .map_err(|e| format!("Cannot reach Ollama: {e}"))?
            .json::<OllamaChatResponse>()
            .await
            .map_err(|e| format!("Response parse error: {e}"))?;

        let msg = resp.message;
        history.push(serde_json::to_value(&msg).unwrap());

        let Some(calls) = msg.tool_calls.clone().filter(|c| !c.is_empty()) else {
            return Ok(msg);
        };

        for call in &calls {
            let _ = app.emit(
                "ai:tool-call",
                AiToolCallEvent {
                    tool_name: call.function.name.clone(),
                    args: call.function.arguments.clone(),
                },
            );

            let result = execute_tool(&clients, call)
                .await
                .unwrap_or_else(|e| format!("{{\"error\":\"{e}\"}}"));

            history.push(serde_json::json!({
                "role": "tool",
                "content": result
            }));
        }
    }

    Err("Max tool-call iterations reached without a final answer".to_string())
}

/// Detect a GPU that Ollama can use for accelerated inference.
/// Tries nvidia-smi (NVIDIA) then rocm-smi (AMD ROCm).
/// Returns a short description string if a GPU is found, None otherwise.
#[tauri::command]
pub async fn ai_check_gpu() -> Option<String> {
    tokio::task::spawn_blocking(|| {
        // NVIDIA
        if let Ok(out) = std::process::Command::new("nvidia-smi")
            .args(["--query-gpu=name,memory.total", "--format=csv,noheader"])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !text.is_empty() {
                    return Some(format!("NVIDIA · {text}"));
                }
            }
        }

        // AMD ROCm
        if let Ok(out) = std::process::Command::new("rocm-smi")
            .arg("--showproductname")
            .output()
        {
            if out.status.success() {
                return Some("AMD GPU (ROCm) detected".to_string());
            }
        }

        None
    })
    .await
    .ok()
    .flatten()
}
