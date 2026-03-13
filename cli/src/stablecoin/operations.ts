import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  loadKeypair,
} from "../solana-helpers";
import type { SssConfig } from "../config";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
  mintTo,
  burn,
  freezeAccount,
  thawAccount,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import { pause, resume } from "@solana/spl-token";
import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";

function getProgramId(cfg: SssConfig): PublicKey {
  return cfg.stablecoin.tokenProgram === "spl-token-2022"
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

function requireMint(cfg: SssConfig): PublicKey {
  const m = cfg.stablecoin.mint?.trim();
  if (!m) throw new Error("Config has no mint address. Deploy first with: sss-token init --custom <config>");
  return new PublicKey(m);
}

export async function runMint(
  cfg: SssConfig,
  recipientStr: string,
  amountRaw: bigint,
): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const payer = loadKeypair(cfg.authorities.mint);
  const mintAuthority = payer;

  const recipient = new PublicKey(recipientStr);
  const destAta = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    recipient,
    { commitment: "confirmed" },
    programId,
  );

  const sig = await mintTo(
    connection,
    payer,
    mint,
    destAta,
    mintAuthority,
    amountRaw,
    [],
    { commitment: "confirmed" },
    programId,
  );
  console.log("Minted:", amountRaw.toString(), "raw units to", recipientStr);
  console.log("Tx:", sig);
}

export async function runBurn(cfg: SssConfig, amountRaw: bigint): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const payer = loadKeypair(cfg.authorities.mint);
  const mintAuthority = payer;

  const sourceAta = getAssociatedTokenAddressSync(
    mint,
    mintAuthority.publicKey,
    false,
    programId,
  );
  const sig = await burn(
    connection,
    payer,
    sourceAta,
    mint,
    mintAuthority,
    amountRaw,
    [],
    { commitment: "confirmed" },
    programId,
  );
  console.log("Burned:", amountRaw.toString(), "raw units");
  console.log("Tx:", sig);
}

export async function runFreeze(cfg: SssConfig, tokenAccountStr: string): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const payer = loadKeypair(cfg.authorities.freeze);
  const freezeAuthority = payer;
  const tokenAccount = new PublicKey(tokenAccountStr);

  const sig = await freezeAccount(
    connection,
    payer,
    tokenAccount,
    mint,
    freezeAuthority,
    [],
    { commitment: "confirmed" },
    programId,
  );
  console.log("Froze token account:", tokenAccountStr);
  console.log("Tx:", sig);
}

export async function runThaw(cfg: SssConfig, tokenAccountStr: string): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const payer = loadKeypair(cfg.authorities.freeze);
  const freezeAuthority = payer;
  const tokenAccount = new PublicKey(tokenAccountStr);

  const sig = await thawAccount(
    connection,
    payer,
    tokenAccount,
    mint,
    freezeAuthority,
    [],
    { commitment: "confirmed" },
    programId,
  );
  console.log("Thawed token account:", tokenAccountStr);
  console.log("Tx:", sig);
}

export async function runPause(cfg: SssConfig): Promise<void> {
  if (cfg.stablecoin.tokenProgram !== "spl-token-2022") {
    throw new Error("Pause is only supported for Token-2022 mints with Pausable extension.");
  }
  const pausePath = cfg.authorities.pause;
  if (!pausePath?.trim()) throw new Error("Config has no [authorities] pause keypair path.");
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const payer = loadKeypair(pausePath);
  const sig = await pause(
    connection,
    payer,
    mint,
    payer,
    [],
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );
  console.log("Paused mint:", mint.toBase58());
  console.log("Tx:", sig);
}

export async function runUnpause(cfg: SssConfig): Promise<void> {
  if (cfg.stablecoin.tokenProgram !== "spl-token-2022") {
    throw new Error("Unpause is only supported for Token-2022 mints with Pausable extension.");
  }
  const pausePath = cfg.authorities.pause;
  if (!pausePath?.trim()) throw new Error("Config has no [authorities] pause keypair path.");
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const payer = loadKeypair(pausePath);
  const sig = await resume(
    connection,
    payer,
    mint,
    payer,
    [],
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );
  console.log("Unpaused mint:", mint.toBase58());
  console.log("Tx:", sig);
}

export async function runStatus(cfg: SssConfig): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);

  console.log("Standard:", cfg.standard);
  console.log("Cluster:", cfg.cluster);
  console.log("Mint:", mint.toBase58());
  console.log("Token program:", cfg.stablecoin.tokenProgram);
  console.log("Authorities (config): mint:", cfg.authorities.mint, "freeze:", cfg.authorities.freeze, "metadata:", cfg.authorities.metadata);

  const mintInfo = await getMint(connection, mint, undefined, programId);
  const decimals = mintInfo.decimals;
  const supply = mintInfo.supply;
  const supplyUi = Number(supply) / Math.pow(10, decimals);
  console.log("Supply (raw):", supply.toString());
  console.log("Supply (UI):", supplyUi);
  console.log("Decimals:", decimals);
  console.log("Mint authority:", mintInfo.mintAuthority?.toBase58() ?? "none");
  console.log("Freeze authority:", mintInfo.freezeAuthority?.toBase58() ?? "none");
  // If Token-2022 and pausable, we could try to read paused state from extension - skip for now to avoid extra parsing
}

export async function runSupply(cfg: SssConfig): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const mintInfo = await getMint(connection, mint, undefined, programId);
  const decimals = mintInfo.decimals;
  const supply = mintInfo.supply;
  const supplyUi = Number(supply) / Math.pow(10, decimals);
  console.log("Supply (raw):", supply.toString());
  console.log("Supply (UI):", supplyUi);
}

export async function runBalance(cfg: SssConfig, walletStr: string): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const programId = getProgramId(cfg);
  const wallet = new PublicKey(walletStr);
  const ata = getAssociatedTokenAddressSync(mint, wallet, false, programId);

  console.log("Token account (ATA):", ata.toBase58());
  try {
    const account = await getAccount(connection, ata, undefined, programId);
    const decimals = (await getMint(connection, mint, undefined, programId)).decimals;
    const ui = Number(account.amount) / Math.pow(10, decimals);
    console.log("Balance (raw):", account.amount.toString());
    console.log("Balance (UI):", ui);
  } catch {
    console.log("Balance (raw): 0");
    console.log("Balance (UI): 0");
  }
}

const AUTHORITY_TYPE_MAP: Record<string, AuthorityType> = {
  mint: AuthorityType.MintTokens,
  freeze: AuthorityType.FreezeAccount,
  metadata: AuthorityType.MetadataPointer,
  "metadata-pointer": AuthorityType.MetadataPointer,
  pause: AuthorityType.PausableConfig,
  "permanent-delegate": AuthorityType.PermanentDelegate,
  "transfer-fee-config": AuthorityType.TransferFeeConfig,
  "close-mint": AuthorityType.CloseMint,
  "interest-rate": AuthorityType.InterestRate,
};

function getAuthorityKeypairPath(cfg: SssConfig, type: string): string {
  const t = type.toLowerCase();
  if (t === "mint") return cfg.authorities.mint;
  if (t === "freeze") return cfg.authorities.freeze;
  if (t === "metadata" || t === "metadata-pointer") return cfg.authorities.metadata;
  if (t === "pause") {
    if (!cfg.authorities.pause?.trim()) throw new Error("Config has no [authorities] pause for type 'pause'.");
    return cfg.authorities.pause;
  }
  if (t === "permanent-delegate") {
    if (!cfg.authorities.permanentDelegate?.trim()) throw new Error("Config has no [authorities] permanentDelegate.");
    return cfg.authorities.permanentDelegate;
  }
  throw new Error(`Unknown authority type: ${type}. Use: mint, freeze, metadata, pause, permanent-delegate`);
}

export async function runSetAuthority(
  cfg: SssConfig,
  typeStr: string,
  newAuthorityStr: string,
): Promise<void> {
  const programId = getProgramId(cfg);
  const mint = requireMint(cfg);
  const type = typeStr.toLowerCase();
  const authorityType = AUTHORITY_TYPE_MAP[type];
  if (authorityType === undefined) {
    throw new Error(`Unknown authority type: ${typeStr}. Use: mint, freeze, metadata, pause, permanent-delegate`);
  }
  const keypairPath = getAuthorityKeypairPath(cfg, type);
  const currentAuthority = loadKeypair(keypairPath);
  const newAuthority =
    newAuthorityStr.toLowerCase() === "none" || newAuthorityStr.trim() === ""
      ? null
      : new PublicKey(newAuthorityStr);

  const connection = getConnection(cfg);
  const tx = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      currentAuthority.publicKey,
      authorityType,
      newAuthority,
      [],
      programId,
    ),
  );
  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [currentAuthority],
    { commitment: "confirmed" },
  );
  console.log("Authority updated:", type, "->", newAuthority?.toBase58() ?? "none");
  console.log("Tx:", sig);
}

export async function runAuditLog(
  cfg: SssConfig,
  limit: number,
  action?: string,
): Promise<void> {
  const connection = getConnection(cfg);
  const mint = requireMint(cfg);
  const signatures = await connection.getSignaturesForAddress(mint, {
    limit,
  });

  console.log(
    `Last ${signatures.length} transactions involving mint ${mint.toBase58()}` +
      (action ? ` (action filter '${action}' is currently informational only)` : ""),
  );
  for (const sig of signatures) {
    const when =
      sig.blockTime !== null && sig.blockTime !== undefined
        ? new Date(sig.blockTime * 1000).toISOString()
        : "unknown-time";
    console.log(
      `- sig=${sig.signature} slot=${sig.slot} err=${sig.err ? JSON.stringify(sig.err) : "ok"} time=${when}`,
    );
  }
}

