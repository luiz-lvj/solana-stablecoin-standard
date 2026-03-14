use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::constants::*;
use crate::error::BlacklistError;
use crate::events::{BlacklistEntryClosed, WalletBlacklisted, WalletUnblacklisted};
use crate::state::{BlacklistEntry, Config};

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct SetBlacklist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + BlacklistEntry::INIT_SPACE,
        seeds = [BLACKLIST_SEED, mint.key().as_ref(), wallet.as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

pub fn add_to_blacklist(ctx: Context<SetBlacklist>, wallet: Pubkey, reason: String) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.admin.key(),
        ctx.accounts.config.admin,
        BlacklistError::Unauthorized
    );
    require_keys_eq!(
        ctx.accounts.config.mint,
        ctx.accounts.mint.key(),
        BlacklistError::MintMismatch
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.wallet = wallet;
    entry.mint = ctx.accounts.mint.key();
    entry.blocked = true;
    entry.reason = reason.clone();
    entry.bump = ctx.bumps.blacklist_entry;

    emit!(WalletBlacklisted {
        mint: ctx.accounts.mint.key(),
        wallet,
        authority: ctx.accounts.admin.key(),
        reason,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

pub fn remove_from_blacklist(ctx: Context<SetBlacklist>, wallet: Pubkey) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.admin.key(),
        ctx.accounts.config.admin,
        BlacklistError::Unauthorized
    );
    require_keys_eq!(
        ctx.accounts.config.mint,
        ctx.accounts.mint.key(),
        BlacklistError::MintMismatch
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.wallet = wallet;
    entry.mint = ctx.accounts.mint.key();
    entry.blocked = false;
    entry.bump = ctx.bumps.blacklist_entry;

    emit!(WalletUnblacklisted {
        mint: ctx.accounts.mint.key(),
        wallet,
        authority: ctx.accounts.admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct CloseBlacklistEntry<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        close = admin,
        seeds = [BLACKLIST_SEED, mint.key().as_ref(), wallet.as_ref()],
        bump = blacklist_entry.bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
}

pub fn close_blacklist_entry(
    ctx: Context<CloseBlacklistEntry>,
    _wallet: Pubkey,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.admin.key(),
        ctx.accounts.config.admin,
        BlacklistError::Unauthorized
    );
    require!(
        !ctx.accounts.blacklist_entry.blocked,
        BlacklistError::CannotCloseBlockedEntry
    );

    emit!(BlacklistEntryClosed {
        mint: ctx.accounts.mint.key(),
        wallet: ctx.accounts.blacklist_entry.wallet,
        authority: ctx.accounts.admin.key(),
    });

    Ok(())
}
