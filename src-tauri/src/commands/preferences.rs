use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "config.json";
const FAVORITES_PROJECTS_KEY: &str = "favoriteProjectIds";
const FAVORITES_LIBRARIES_KEY: &str = "favoriteLibraryIds";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoritesPayload {
    pub project_ids: Vec<String>,
    pub library_ids: Vec<i64>,
}

/// Load persisted favorite project and library IDs.
#[tauri::command]
pub async fn load_favorites(app: AppHandle) -> Result<FavoritesPayload, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;

    let project_ids: Vec<String> = store
        .get(FAVORITES_PROJECTS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let library_ids: Vec<i64> = store
        .get(FAVORITES_LIBRARIES_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(FavoritesPayload { project_ids, library_ids })
}

/// Persist favorite project and library IDs.
#[tauri::command]
pub async fn save_favorites(
    app: AppHandle,
    project_ids: Vec<String>,
    library_ids: Vec<i64>,
) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(
        FAVORITES_PROJECTS_KEY,
        serde_json::to_value(&project_ids).unwrap_or_default(),
    );
    store.set(
        FAVORITES_LIBRARIES_KEY,
        serde_json::to_value(&library_ids).unwrap_or_default(),
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
