use crate::error::{AppError, AppResult};

/// Validates an organization URL format.
pub fn validate_org_url(url: &str) -> AppResult<()> {
    let trimmed = url.trim();

    if trimmed.is_empty() {
        return Err(AppError::InvalidOrgUrl("URL cannot be empty".to_string()));
    }

    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err(AppError::InvalidOrgUrl(
            "URL must start with http:// or https://".to_string(),
        ));
    }

    Ok(())
}
