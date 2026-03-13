# `sss-token` CLI

A command-line tool for **stablecoin managers** on Solana. Use it to deploy and operate SPL tokens that follow the [Solana Stablecoin Standard](https://superteam.fun/earn/listing/build-the-solana-stablecoin-standard-bounty) (SSS), with support for Token-2022 and extensions (metadata, freeze, pause, etc.).

---

## Table of contents

- [Install & build](#install--build)
- [Two ways to use the CLI](#two-ways-to-use-the-cli)
- [Tutorial: Deploy a new stablecoin (SSS-1)](#tutorial-deploy-a-new-stablecoin-sss-1)
- [Tutorial: Manage an existing stablecoin](#tutorial-manage-an-existing-stablecoin)
- [Configuration reference](#configuration-reference)
- [Commands reference](#commands-reference)
- [Updating authorities](#updating-authorities)

---

## Install & build

From the `cli/` directory:

```bash
npm install
npm run build
```

Run the CLI:

```bash
npx sss-token --help
```

For development (no build step):

```bash
npm run dev -- <command> [options]
```

Example:

```bash
npm run dev -- init --preset sss-1
```

---

## Two ways to use the CLI

1. **You don’t have a stablecoin yet**  
   Create a config (or use a preset), then deploy a new Token-2022 mint with the CLI. The config’s `mint` field is left empty and is filled after deployment.

2. **You already have a stablecoin**  
   Point the CLI at your existing mint by setting `[stablecoin] mint = "<your-mint-address>"` in the config. Use the same config to run operations (mint, burn, freeze, status, etc.).

All commands are **config-driven**: by default the CLI looks for `sss-token.config.toml` in the current directory. Override with `--config <path>` when needed.

---

## Tutorial: Deploy a new stablecoin (SSS-1)

This walkthrough creates a new Token-2022 mint with metadata (name, symbol, URI) on devnet.

### Step 1: Create a config from a preset

Generate a starter config for the SSS-1 profile:

```bash
sss-token init --preset sss-1
```

This creates `sss-token.config.toml` in the current directory with:

- `standard = "sss-1"`
- `cluster = "devnet"`
- `[stablecoin]` with name/symbol/decimals and `tokenProgram = "spl-token-2022"`
- `mint = ""` (to be filled after deploy)
- `[authorities]` paths for mint, freeze, and metadata (default: `~/.config/solana/id.json`)
- `[extensions.metadata] enabled = true`

### Step 2: Edit the config (optional)

Open `sss-token.config.toml` and adjust:

- **`[stablecoin]`**  
  - `name`, `symbol`, `decimals`  
  - `uri` (optional; for metadata, e.g. a JSON or info URL)
- **`[authorities]`**  
  - Paths to keypair JSON files for mint, freeze, and metadata.  
  - The **mint authority** keypair is used as the transaction payer and mint signer.  
  - Ensure these files exist and correspond to wallets with devnet SOL if you use devnet.

For a full list of options, see `example.config.toml`.

### Step 3: Deploy the mint

Run:

```bash
sss-token init --custom config.toml
```

(You can use `config.toml` or `sss-token.config.toml`; if you created the file in step 1, `sss-token init --custom sss-token.config.toml` is equivalent.)

The CLI will:

1. Create a new Token-2022 mint account (with MetadataPointer extension).
2. Initialize the base mint (decimals, mint authority, freeze authority).
3. Call `tokenMetadataInitialize` to add name, symbol, and URI on-chain.
4. Write the new mint address into the config’s `[stablecoin] mint` field.

Example output:

```
=== SSS deploy ===
Standard: sss-1
Cluster: devnet
Token program: spl-token-2022
Name / symbol / decimals: MyUSD MUSD 6
Metadata extension: enabled (on-mint name, symbol, uri)

Created mint: 7NDkaMubatXw8fHQ2zNU4eid8Nkh5vG9SxQMSzUyE9SM
Updated config with mint address: /path/to/sss-token.config.toml
Deployment complete.
```

After this, the same config file is ready for all management commands (mint, burn, freeze, status, etc.).

---

## Tutorial: Manage an existing stablecoin

If the stablecoin is already deployed, you only need a config that points at it.

1. **Create or copy a config** (e.g. from `example.config.toml`).
2. Set **`[stablecoin] mint = "<your-mint-address>"`**.
3. Set **`[authorities]`** to the keypair paths that hold:
   - **mint** authority (for minting, and often as payer)
   - **freeze** authority (for freeze/thaw)
   - **metadata** authority (for metadata updates; Token-2022 MetadataPointer)
4. Set **`cluster`** and optionally **`rpcUrl`** to match the mint’s network.

No need to run `init --custom` again; use the operations below.

---

## Configuration reference

The CLI expects a TOML file with the following structure.

### Top-level

| Field      | Description |
|-----------|-------------|
| `standard` | `"sss-1"` or `"sss-2"` (SSS profile). |
| `cluster`  | `"devnet"`, `"testnet"`, `"mainnet-beta"`, or a custom label. |
| `rpcUrl`   | Optional. Overrides the default RPC for the cluster. |

### `[stablecoin]`

| Field           | Description |
|----------------|-------------|
| `name`         | Human-readable token name. |
| `symbol`       | Ticker symbol. |
| `decimals`     | Number of decimals (e.g. `6`). |
| `tokenProgram` | `"spl-token-2022"` (recommended) or `"spl-token"`. |
| `uri`          | Optional. URI for Token-2022 metadata (e.g. JSON URL). |
| `mint`         | Mint address. Empty before deploy; filled by `sss-token init --custom`. |

### `[authorities]`

Paths to keypair JSON files (Solana keypair format). `~` is expanded.

| Field                | Description |
|----------------------|-------------|
| `mint`               | Mint authority (required for minting). |
| `freeze`             | Freeze authority (required for freeze/thaw). |
| `metadata`           | Metadata (MetadataPointer) update authority. |
| `permanentDelegate`  | Optional. Permanent delegate authority. |
| `pause`              | Optional. Pause authority (Pausable extension). |

### `[extensions.*]`

Which Token-2022 extensions are enabled (used at deploy time for new mints).

- **`[extensions.metadata]`** – `enabled = true/false`. SSS-1 uses on-mint metadata.
- **`[extensions.pausable]`** – `enabled = true/false`.
- **`[extensions.permanentDelegate]`** – `enabled = true/false`.
- **`[extensions.transferHook]`** – `enabled = true/false`, `programId = "<id>"`.

See `example.config.toml` for a full sample.

---

## Commands reference

### `init` – Create config or deploy mint

```bash
sss-token init --preset sss-1
sss-token init --preset sss-2
sss-token init --custom <path-to-config.toml>
```

- **`--preset sss-1`** / **`--preset sss-2`**  
  Writes a new `sss-token.config.toml` (or current directory default) with that preset. Does not deploy.
- **`--custom <path>`**  
  Deploys a new mint from the given config. Requires `mint = ""`. Writes the new mint address back into the config.

---

### `mint` – Mint tokens to a recipient

```bash
sss-token mint <recipient> <amount> [--config <path>]
```

- **`<recipient>`** – Solana wallet address (base58). The CLI creates the associated token account (ATA) for the mint if it does not exist.
- **`<amount>`** – Amount in **raw units** (smallest decimals). For 6 decimals, `1000000` = 1 token.

Uses the mint authority from config and the token program (Token-2022 or legacy) from `[stablecoin]`.

---

### `burn` – Burn tokens

```bash
sss-token burn <amount> [--config <path>]
```

Burns `<amount>` (raw units) from the **mint authority’s** token account for this mint. That account must exist and hold at least `<amount>`.

---

### `freeze` / `thaw` – Freeze or unfreeze a token account

```bash
sss-token freeze <address> [--config <path>]
sss-token thaw <address> [--config <path>]
```

- **`<address>`** – The **token account** (not the wallet) to freeze or thaw. Use the ATA or any token account for this mint.

Requires the freeze authority from config.

---

### `pause` / `unpause` – Pause or resume mint activity (Token-2022 Pausable)

```bash
sss-token pause [--config <path>]
sss-token unpause [--config <path>]
```

Only apply to mints that use the Token-2022 **Pausable** extension. Requires the pause authority (e.g. `[authorities] pause` in config).

---

### `status` – Token and supply snapshot

```bash
sss-token status [--config <path>]
```

Prints config (standard, cluster, mint) and on-chain info: supply, decimals, and current mint/freeze authorities.

---

### `supply` – Total supply only

```bash
sss-token supply [--config <path>]
```

Prints the current total supply (raw and human-readable) for the configured mint.

---

### `balance` – Balance of an address

```bash
sss-token balance <address> [--config <path>]
```

- **`<address>`** – Wallet address (base58). The CLI resolves the **associated token account** for the configured mint and prints its balance (raw and human-readable). If the ATA does not exist, the balance is 0.

---

### `set-authority` – Update an authority (mint, freeze, metadata, pause, etc.)

Stablecoins can have multiple authorities (mint, freeze, metadata pointer, pause, etc.). Use this command to change who controls them.

```bash
sss-token set-authority <type> <new-authority> [--config <path>]
```

- **`<type>`** – One of: `mint`, `freeze`, `metadata`, `pause`, `permanent-delegate`, etc., depending on the mint’s extensions.
- **`<new-authority>`** – New authority public key (base58), or `none` to remove the authority (where the program allows it).

The **current** authority is taken from config: the keypair for the corresponding authority (e.g. `authorities.mint` for `mint`, `authorities.metadata` for `metadata`). That keypair must sign the transaction.

Examples:

```bash
# Set a new mint authority
sss-token set-authority mint 9abc...xyz

# Set a new metadata (MetadataPointer) authority
sss-token set-authority metadata GuU4YH1v6DdkbZwh5Qi7prDxEupGFTtUaTU7EpzRHbQU

# Remove freeze authority (if the program allows)
sss-token set-authority freeze none
```

Not all authority types exist on every mint; the CLI maps `<type>` to the correct Token-2022 `AuthorityType` (e.g. `MetadataPointer`, `PausableConfig`). If the mint does not have that extension, the transaction will fail on-chain.

---

### `audit-log` – Recent transactions for the mint

```bash
sss-token audit-log [--limit <n>] [--config <path>] [--action <type>]
```

- **`--limit <n>`** – How many recent signatures to fetch (default `20`, max `1000`).
- **`--action <type>`** – Reserved for future filtering (e.g. `mint`, `burn`, `freeze`). For now it is informational only; the command prints all recent transactions involving the mint.

The command calls `getSignaturesForAddress` on the mint and prints, for each transaction:

- Signature
- Slot
- Error status
- Block time (if available)

This gives you a quick, chain-level audit trail to feed into more detailed analysis or an external explorer.

---

## Updating authorities

After deployment, you can change who can mint, freeze, update metadata, or pause:

1. Ensure the **current** authority keypair for that type is in your config (e.g. `authorities.metadata` for the metadata pointer).
2. Run:
   ```bash
   sss-token set-authority <type> <new-pubkey>
   ```
3. To use the new authority for future CLI commands, update your config (e.g. point `authorities.metadata` to the new keypair path). The on-chain mint already has the new authority; the config only tells the CLI which keypair to use when signing.

---

## Roadmap

- **SSS-2**-specific features (e.g. blacklist, seize, audit log) when the standard is defined.
- Optional **SDK** layer so the same logic can be used from scripts or other apps.

As new commands or options are added, this README will be kept in sync.
