use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub pending_admin: Option<Pubkey>,
    pub mint: Pubkey,
    pub paused: bool,
    pub bump: u8,
    pub _reserved: [u8; 63],
}

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub wallet: Pubkey,
    pub mint: Pubkey,
    pub blocked: bool,
    #[max_len(128)]
    pub reason: String,
    pub evidence_hash: [u8; 32],
    #[max_len(256)]
    pub evidence_uri: String,
    pub bump: u8,
}
