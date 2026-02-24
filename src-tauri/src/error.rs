use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not authenticated")]
    NotAuthenticated,

    #[error("Client lock poisoned")]
    ClientLockPoisoned,

    #[error("Credentials lock poisoned")]
    CredentialsLockPoisoned,

    #[error("Invalid organization URL: {0}")]
    InvalidOrgUrl(String),

    #[error("Azure DevOps API error: {0}")]
    AzureDevOpsApi(String),

    #[error("Keyring error: {0}")]
    Keyring(#[from] keyring::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;
