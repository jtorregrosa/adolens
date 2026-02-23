use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use strsim::jaro_winkler;
use tauri::{Emitter, State};

use crate::{CachedAdoClients, ClientState, OllamaClientState};

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
                "description": "REQUIRED when the user asks for a list of projects, which projects exist, to show/display projects, or what projects are available. This is the ONLY way to get real project names — you have no built-in knowledge of the organisation. Returns each project's name and id. You MUST call this tool before answering any question about which projects exist; never invent or guess project names. For list_variable_groups and get_variable_group pass the project name (from this list or as the user said it); the system resolves names.",
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
                            "description": "The project name (as the user said it, or from list_projects). Always use the project name, not the id. The system matches names case-insensitively and tolerates typos."
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
                            "description": "The project name (as the user said it, or from list_projects). Always use the project name, not the id. Names are matched case-insensitively and typos are tolerated."
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

    /// Returns true if the string looks like an Azure DevOps project GUID.
    fn is_project_guid(s: &str) -> bool {
        let s = s.trim();
        if s.len() != 36 {
            return false;
        }
        let b = s.as_bytes();
        for &i in &[8, 13, 18, 23] {
            if b.get(i) != Some(&b'-') {
                return false;
            }
        }
        s.chars()
            .enumerate()
            .all(|(i, c)| [8, 13, 18, 23].contains(&i) || c.is_ascii_hexdigit())
    }

    /// Resolves project_id_or_name using optional pre-fetched project list. When provided, uses
    /// that list (one fetch per chat turn); otherwise fetches projects first.
    async fn resolve_project_id(
        &self,
        project_id_or_name: &str,
        projects: Option<&[Value]>,
    ) -> Result<String, String> {
        match projects {
            Some(list) => Self::resolve_project_id_with_list(project_id_or_name, list),
            None => {
                let list = self.list_projects().await?;
                Self::resolve_project_id_with_list(project_id_or_name, &list)
            }
        }
    }

    /// Resolves project name against a pre-fetched list: exact case-insensitive match, then
    /// best Jaro-Winkler match above threshold. Used so one project list serves the whole turn.
    fn resolve_project_id_with_list(project_id_or_name: &str, projects: &[Value]) -> Result<String, String> {
        let input = project_id_or_name.trim();
        if input.is_empty() {
            return Err("Project ID or name is empty".to_string());
        }
        if ReadOnlyAdoClients::is_project_guid(input) {
            return Ok(input.to_string());
        }
        let input_lower = input.to_lowercase();
        for p in projects {
            let name = p["name"].as_str().unwrap_or("").trim();
            if name.eq_ignore_ascii_case(input) {
                if let Some(id) = p["id"].as_str() {
                    return Ok(id.to_string());
                }
            }
        }
        // No match: pass through so the API can accept the name if it’s valid
        // Normalized contains: e.g. "authmanager" -> "Authorization Manager"
        fn normalize(s: &str) -> String {
            s.chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .flat_map(|c| c.to_lowercase())
                .collect()
        }
        let input_norm = normalize(input);
        if input_norm.len() >= 3 {
            let mut contains_candidates: Vec<(f64, String)> = Vec::new();
            for p in projects {
                let name = p["name"].as_str().unwrap_or("").trim();
                let name_norm = normalize(name);
                let id = match p["id"].as_str() {
                    Some(id) => id,
                    None => continue,
                };
                if name_norm.contains(&input_norm) || input_norm.contains(&name_norm) {
                    let score = jaro_winkler(&input_lower, &name.to_lowercase());
                    contains_candidates.push((score, id.to_string()));
                }
            }
            if let Some((_, id)) = contains_candidates
                .into_iter()
                .max_by(|(a, _), (b, _)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            {
                return Ok(id);
            }
        }
        // Jaro-Winkler above threshold
        const JARO_WINKLER_THRESHOLD: f64 = 0.85;
        let mut best_score: f64 = 0.0;
        let mut best_id: Option<String> = None;
        for p in projects {
            let name = p["name"].as_str().unwrap_or("").trim();
            let name_lower = name.to_lowercase();
            let score = jaro_winkler(&input_lower, &name_lower);
            if score >= JARO_WINKLER_THRESHOLD && score > best_score {
                best_score = score;
                best_id = p["id"].as_str().map(String::from);
            }
        }
        if let Some(id) = best_id {
            return Ok(id);
        }
        Ok(input.to_string())
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
    /// (no variable values are returned here). Resolves project name using optional project list.
    async fn list_variable_groups(
        &self,
        project_id: &str,
        projects: Option<&[Value]>,
    ) -> Result<Vec<Value>, String> {
        let project_id = self.resolve_project_id(project_id, projects).await?;
        let result = self
            .0
            .distributed_task
            .variablegroups_client()
            .get_variable_groups(&self.0.org_name, &project_id)
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
    /// the language model. Resolves project name using optional project list.
    async fn get_variable_group(
        &self,
        project_id: &str,
        group_id: i32,
        projects: Option<&[Value]>,
    ) -> Result<Value, String> {
        let project_id = self.resolve_project_id(project_id, projects).await?;
        let g = self
            .0
            .distributed_task
            .variablegroups_client()
            .get(&self.0.org_name, &project_id, group_id)
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
    projects: Option<&[Value]>,
) -> Result<String, String> {
    let args = &call.function.arguments;

    match call.function.name.as_str() {
        "list_projects" => {
            let list = match projects {
                Some(p) => p,
                None => return Ok(serde_json::to_string(&clients.list_projects().await?).unwrap()),
            };
            Ok(serde_json::to_string(list).unwrap())
        }

        "list_variable_groups" => {
            let project_id = args["project_id"]
                .as_str()
                .ok_or("Missing argument: project_id")?;
            let groups = clients.list_variable_groups(project_id, projects).await?;
            Ok(serde_json::to_string(&groups).unwrap())
        }

        "get_variable_group" => {
            let project_id = args["project_id"]
                .as_str()
                .ok_or("Missing argument: project_id")?;
            let group_id = args["group_id"]
                .as_i64()
                .ok_or("Missing argument: group_id")? as i32;
            let group = clients.get_variable_group(project_id, group_id, projects).await?;
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
pub async fn ai_check_ollama(ollama: State<'_, OllamaClientState>) -> Result<bool, String> {
    Ok(ollama
        .0
        .get(format!("{OLLAMA_URL}/api/tags"))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false))
}

/// Returns true if the given model is already downloaded in Ollama.
#[tauri::command]
pub async fn ai_check_model(ollama: State<'_, OllamaClientState>, model: String) -> Result<bool, String> {
    #[derive(Deserialize)]
    struct TagsResponse {
        models: Vec<ModelEntry>,
    }
    #[derive(Deserialize)]
    struct ModelEntry {
        name: String,
    }

    let resp = ollama
        .0
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
pub async fn ai_pull_model(
    app: tauri::AppHandle,
    ollama: State<'_, OllamaClientState>,
    model: String,
) -> Result<(), String> {
    let resp = ollama
        .0
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
You have NO built-in knowledge of the user's organisation. All project names, variable groups, and \
variable values MUST be obtained by calling the provided tools. Never invent, guess, or list \
projects or libraries from memory. When the user asks for a list of projects (e.g. \"list projects\", \
\"what projects are there\", \"show me projects\"), you MUST call the list_projects tool and then \
report exactly what it returns — do not answer with project names without calling the tool. \
Never guess variable values — always fetch them with tools first. \
Secret variable values are masked as [secret] by the system; never claim to know their actual content. \
Users refer to projects by name. Pass the project name to list_variable_groups and get_variable_group; \
the system resolves names (case-insensitive, typos tolerated). \
If a tool returns an error about no project matching, call list_projects and use the project name from the list that best matches. \
Be concise and factual. Format lists using markdown bullet points.";

/// Execute one chat turn through the full agentic loop. Calls tools as needed
/// and emits "ai:tool-call" events for each tool invocation so the UI can
/// display live progress. Returns the final assistant message once the model
/// produces a plain-text response with no remaining tool calls.
#[tauri::command]
pub async fn ai_chat(
    app: tauri::AppHandle,
    state: State<'_, ClientState>,
    ollama: State<'_, OllamaClientState>,
    messages: Vec<ChatMessage>,
    model: String,
) -> Result<ChatMessage, String> {
    // Wrap in the read-only facade — execute_tool can never reach write methods.
    let clients = ReadOnlyAdoClients::new(state.get()?);
    let tools = tool_definitions();

    let mut history: Vec<Value> = std::iter::once(serde_json::json!({
        "role": "system",
        "content": SYSTEM_PROMPT
    }))
    .chain(messages.iter().map(|m| serde_json::to_value(m).unwrap()))
    .collect();

    // Fetch all projects once so every tool call (list_projects, list_variable_groups,
    // get_variable_group) uses the same list for name resolution and responses.
    let project_list = clients.list_projects().await?;

    for _ in 0..10 {
        let resp = ollama
            .0
            .post(format!("{OLLAMA_URL}/api/chat"))
            .json(&serde_json::json!({
                "model": model,
                "messages": history,
                "tools": tools,
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

            let result = execute_tool(&clients, call, Some(&project_list))
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
