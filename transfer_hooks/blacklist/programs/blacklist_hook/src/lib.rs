use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use spl_token_2022::{
    extension::StateWithExtensions,
    state::Account as TokenAccountState,
};

declare_id!("84rPjkmmoP3oYZVxjtL2rdcT6hC5Rts6N5XzJTFcJEk6");

const CONFIG_SEED: &[u8] = b"config";
const BLACKLIST_SEED: &[u8] = b"blacklist";
const EXTRA_ACCOUNT_METAS_SEED: &[u8] = b"extra-account-metas";

#[program]
pub mod blacklist_hook {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.mint = ctx.accounts.mint.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        let metas = vec![
            // config PDA = ["config", mint]
            ExtraAccountMeta::new_with_seeds(
                &[
                    spl_tlv_account_resolution::seeds::Seed::Literal {
                        bytes: CONFIG_SEED.to_vec(),
                    },
                    spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, // mint
                ],
                false,
                false,
            )?,
            // source blacklist = ["blacklist", source_token.owner]
            ExtraAccountMeta::new_with_seeds(
                &[
                    spl_tlv_account_resolution::seeds::Seed::Literal {
                        bytes: BLACKLIST_SEED.to_vec(),
                    },
                    spl_tlv_account_resolution::seeds::Seed::AccountData {
                        account_index: 0,
                        data_index: 32,
                        length: 32,
                    },
                ],
                false,
                false,
            )?,
            // destination blacklist = ["blacklist", destination_token.owner]
            ExtraAccountMeta::new_with_seeds(
                &[
                    spl_tlv_account_resolution::seeds::Seed::Literal {
                        bytes: BLACKLIST_SEED.to_vec(),
                    },
                    spl_tlv_account_resolution::seeds::Seed::AccountData {
                        account_index: 2,
                        data_index: 32,
                        length: 32,
                    },
                ],
                false,
                false,
            )?,
        ];

        let mut data = ctx
            .accounts
            .extra_account_meta_list
            .try_borrow_mut_data()?;

        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &metas)?;
        Ok(())
    }

    pub fn add_to_blacklist(ctx: Context<SetBlacklist>, wallet: Pubkey) -> Result<()> {
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
        entry.blocked = true;
        entry.bump = ctx.bumps.blacklist_entry;
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
        entry.blocked = false;
        entry.bump = ctx.bumps.blacklist_entry;
        Ok(())
    }

    pub fn transfer_hook(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
        let (expected_extra_account_meta_list, _) = Pubkey::find_program_address(
            &[EXTRA_ACCOUNT_METAS_SEED, ctx.accounts.mint.key().as_ref()],
            ctx.program_id,
        );

        require_keys_eq!(
            expected_extra_account_meta_list,
            ctx.accounts.extra_account_meta_list.key(),
            BlacklistError::InvalidExtraAccountMetaList
        );

        require_keys_eq!(
            ctx.accounts.config.mint,
            ctx.accounts.mint.key(),
            BlacklistError::MintMismatch
        );

        let source_data = ctx.accounts.source_token.try_borrow_data()?;
        let destination_data = ctx.accounts.destination_token.try_borrow_data()?;

        let source_state = StateWithExtensions::<TokenAccountState>::unpack(&source_data)
            .map_err(|_| error!(BlacklistError::InvalidTokenAccount))?;
        let destination_state = StateWithExtensions::<TokenAccountState>::unpack(&destination_data)
            .map_err(|_| error!(BlacklistError::InvalidTokenAccount))?;

        require_keys_eq!(
            source_state.base.mint,
            ctx.accounts.mint.key(),
            BlacklistError::MintMismatch
        );
        require_keys_eq!(
            destination_state.base.mint,
            ctx.accounts.mint.key(),
            BlacklistError::MintMismatch
        );

        let source_owner = source_state.base.owner;
        let destination_owner = destination_state.base.owner;

        let (expected_source_blacklist, _) =
            Pubkey::find_program_address(&[BLACKLIST_SEED, source_owner.as_ref()], ctx.program_id);

        let (expected_destination_blacklist, _) = Pubkey::find_program_address(
            &[BLACKLIST_SEED, destination_owner.as_ref()],
            ctx.program_id,
        );

        require_keys_eq!(
            expected_source_blacklist,
            ctx.accounts.source_blacklist.key(),
            BlacklistError::InvalidBlacklistAccount
        );
        require_keys_eq!(
            expected_destination_blacklist,
            ctx.accounts.destination_blacklist.key(),
            BlacklistError::InvalidBlacklistAccount
        );

        if is_blacklisted(&ctx.accounts.source_blacklist)? {
            return err!(BlacklistError::Blacklisted);
        }

        if is_blacklisted(&ctx.accounts.destination_blacklist)? {
            return err!(BlacklistError::Blacklisted);
        }

        Ok(())
    }

    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}

fn is_blacklisted(account_info: &AccountInfo) -> Result<bool> {
    let mut data: &[u8] = &account_info.try_borrow_data()?;
    let entry = BlacklistEntry::try_deserialize(&mut data)
        .map_err(|_| error!(BlacklistError::InvalidBlacklistAccount))?;
    Ok(entry.blocked)
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.mint == mint.key() @ BlacklistError::MintMismatch,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = payer,
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump,
        space = 8 + 256
    )]
    /// CHECK: raw TLV account
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

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
        seeds = [BLACKLIST_SEED, wallet.as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    /// CHECK: validated by parsing token state
    pub source_token: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: validated by parsing token state
    pub destination_token: UncheckedAccount<'info>,

    /// CHECK: source authority / delegate from token-2022
    pub authority: UncheckedAccount<'info>,

    /// CHECK: validation / extra-account-metas PDA
    #[account(
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: validated manually
    pub source_blacklist: UncheckedAccount<'info>,

    /// CHECK: validated manually
    pub destination_blacklist: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub wallet: Pubkey,
    pub blocked: bool,
    pub bump: u8,
}

#[error_code]
pub enum BlacklistError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Wallet is blacklisted")]
    Blacklisted,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid blacklist account")]
    InvalidBlacklistAccount,
    #[msg("Invalid extra account meta list account")]
    InvalidExtraAccountMetaList,
}