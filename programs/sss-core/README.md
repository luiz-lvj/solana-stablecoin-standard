# SSS-Core — Solana Stablecoin Standard Core Program

On-chain Anchor program that defines the **Stablecoin Config PDA** — the foundation of the Solana Stablecoin Standard. It provides RBAC, per-minter quotas, pause/unpause, two-step authority transfer, freeze/thaw, and seize — all enforced on-chain.

## Why This Matters

Without a config PDA program, there is no "standard" — just an SDK wrapper around `@solana/spl-token`. The config PDA is what makes stablecoins created with SSS **identifiable, manageable, and composable**.

## Architecture

```
StablecoinConfig PDA                RoleEntry PDA (per wallet+role)
["sss-config", mint]                ["role", config, grantee, role_type]
┌─────────────────────┐             ┌──────────────────────┐
│ authority            │             │ config               │
│ pending_authority    │             │ authority (grantee)   │
│ mint                 │             │ role: u8              │
│ preset (1=SSS-1,    │             │ granted_at: i64       │
│         2=SSS-2)    │             │ bump                  │
│ paused               │             │ _reserved: [u8; 32]   │
│ total_minted         │             └──────────────────────┘
│ total_burned         │
│ supply_cap           │             MinterInfo PDA
│ bump                 │             ["minter", config, minter]
│ _reserved: [u8; 64]  │             ┌──────────────────────┐
└─────────────────────┘             │ config               │
                                    │ minter               │
                                    │ quota: u64            │
                                    │ total_minted: u64     │
                                    │ is_active             │
                                    │ bump                  │
                                    │ _reserved: [u8; 32]   │
                                    └──────────────────────┘
```

## Instructions

| Instruction | Signer | Description |
|---|---|---|
| `initialize` | Authority | Create config PDA; transfer mint + freeze authority to PDA |
| `grant_role` | Authority | Grant a role (PDA per config+grantee+role) |
| `revoke_role` | Authority | Revoke a role (closes PDA, reclaims rent) |
| `set_minter_quota` | Authority | Create or update a minter's quota |
| `mint_tokens` | Minter | Mint tokens (checks role, quota, pause, supply cap) |
| `burn_tokens` | Burner | Burn tokens from own ATA (checks role, pause) |
| `pause` | Pauser | Pause all operations |
| `unpause` | Pauser | Resume all operations |
| `freeze_token_account` | Freezer | Freeze a token account |
| `thaw_token_account` | Freezer | Thaw a frozen token account |
| `transfer_authority` | Authority | Nominate a new authority (step 1 of 2) |
| `accept_authority` | New authority | Accept authority nomination (step 2 of 2) |
| `seize` | Seizer | Thaw → burn → mint to treasury → re-freeze |

## Roles

| Role | Value | Capability |
|---|---|---|
| `MINTER` | 0 | Mint tokens (subject to quota) |
| `BURNER` | 1 | Burn own tokens |
| `FREEZER` | 2 | Freeze/thaw token accounts |
| `PAUSER` | 3 | Pause/unpause operations |
| `BLACKLISTER` | 4 | Manage blacklist (via transfer hook program) |
| `SEIZER` | 5 | Seize tokens from frozen accounts |

## Events

All state-changing instructions emit typed events:

- `ConfigInitialized` — Config PDA created
- `TokensMinted` / `TokensBurned` — Supply changes
- `StablecoinPaused` / `StablecoinUnpaused`
- `RoleGranted` / `RoleRevoked`
- `MinterQuotaSet`
- `AuthorityNominated` / `AuthorityTransferred`
- `TokensSeized`
- `TokenAccountFrozen` / `TokenAccountThawed`

## Flow

```
1. Create Token-2022 mint (with extensions: PermanentDelegate, etc.)
2. Call `initialize` → config PDA takes over mint + freeze authority
3. Grant roles to operators
4. Set minter quotas
5. Minters mint, burners burn, freezers freeze — all role-gated
```

## Build & Test

```bash
cd programs/sss-core
anchor build
anchor test
```

## Program ID

```
4ZFzYcNVDSew79hSAVRdtDuMqe9g4vYh7CFvitPSy5DD
```
