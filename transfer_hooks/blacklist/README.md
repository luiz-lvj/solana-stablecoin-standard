# Solana Anchor blacklist transfer hook

This workspace contains a Token-2022 transfer-hook program written in Anchor. The hook blocks transfers whenever the source wallet owner or destination wallet owner is present in an on-chain blacklist PDA.

## What is in the project

- `programs/blacklist_hook/src/lib.rs`: Anchor transfer-hook program
- `tests/blacklist-hook.ts`: integration test that
  - creates a Token-2022 mint with the transfer-hook extension
  - creates ATAs
  - initializes the hook config and extra-account-meta PDA
  - proves a normal transfer succeeds
  - blacklists the recipient and proves the next transfer fails

## PDA layout

- config: `["config", mint]`
- blacklist entry: `["blacklist", mint, wallet]`
- extra account metas: `["extra-account-metas", mint]`

## Why the extra-account-meta PDA matters

The Token-2022 transfer-hook flow resolves additional accounts for `Execute` from the predefined `extra-account-metas` PDA, derived from the literal seed `"extra-account-metas"`, the mint address, and the transfer-hook program id. That is how the test is able to build a transfer instruction that automatically includes the hook's extra accounts. citeturn178301view0turn178301view3

## Why blacklist by wallet owner instead of token account

The hook reads the owner field out of the source and destination token-account data and derives blacklist PDAs from those wallet pubkeys. The Solana transfer-hook guide shows that `Seed::AccountData { account_index: 0, data_index: 32, length: 32 }` can be used to read the token-account owner bytes, since the owner is stored at offset `32..64` in the token account layout. citeturn104200view1

## Run locally

1. Install a matching toolchain:
   - Anchor CLI `0.31.x`
   - `@coral-xyz/anchor` `0.31.x`
   - a recent Solana toolchain compatible with your Anchor install
2. In the workspace root:

```bash
npm install
anchor build
anchor test
```

## Notes

- The program uses Anchor's `#[interface(spl_transfer_hook_interface::execute)]` support, which Anchor documents as the modern way to match the Transfer Hook interface discriminator. citeturn178301view1
- Token extensions generally must be chosen when the mint is created; Anchor's token extension docs call out that most extensions cannot be added after account creation. citeturn178301view2
- This project is designed as a minimal blacklist validator hook. It does not freeze token accounts, implement role rotation, or maintain per-jurisdiction policy logic.

## Production hardening ideas

- add `set_admin` / `accept_admin` flow
- emit events on blacklist changes
- add allowlist mode beside blocklist mode
- add tests for blacklisted sender as well as blacklisted recipient
- optionally combine this with default-frozen / freeze-authority controls if you want issuer-operated compliance behavior
