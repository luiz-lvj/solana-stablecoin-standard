use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::BlacklistError;
use crate::events::{TransfersPaused, TransfersUnpaused};
use crate::state::Config;

#[derive(Accounts)]
pub struct PauseHook<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED, config.mint.as_ref()],
        bump = config.bump,
        constraint = config.admin == admin.key() @ BlacklistError::Unauthorized,
    )]
    pub config: Account<'info, Config>,
}

pub fn pause_hook(ctx: Context<PauseHook>) -> Result<()> {
    require!(!ctx.accounts.config.paused, BlacklistError::AlreadyPaused);
    ctx.accounts.config.paused = true;

    emit!(TransfersPaused {
        config: ctx.accounts.config.key(),
        admin: ctx.accounts.admin.key(),
    });

    Ok(())
}

pub fn unpause_hook(ctx: Context<PauseHook>) -> Result<()> {
    require!(ctx.accounts.config.paused, BlacklistError::NotPaused);
    ctx.accounts.config.paused = false;

    emit!(TransfersUnpaused {
        config: ctx.accounts.config.key(),
        admin: ctx.accounts.admin.key(),
    });

    Ok(())
}
