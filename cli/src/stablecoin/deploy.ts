import path from "path";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import {
  loadConfig,
  updateConfigMint,
  defaultConfigPath,
  type SssConfig,
} from "../config";
import { getConnection, loadKeypair } from "../solana-helpers";
import {
  createMint,
  createInitializeMint2Instruction,
  createInitializeMetadataPointerInstruction,
  tokenMetadataInitialize,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
} from "@solana/spl-token";
import { sendAndConfirmTransaction } from "@solana/web3.js";

/** Default assumed mint size after metadata realloc (name/symbol/uri + padding). */
const ASSUMED_FINAL_MINT_SIZE = 4096;

/**
 * Deploys a new SPL mint from config: creates the mint on-chain (with optional
 * Token-2022 Metadata extension), then updates the config file with the new mint address.
 *
 * Token-2022 with metadata follows the working pattern:
 * - Allocate only for MetadataPointer; fund with enough lamports for final size.
 * - Tx1: CreateAccount → MetadataPointer → InitializeMint2.
 * - Tx2: tokenMetadataInitialize (reallocs mint and writes name/symbol/uri).
 */
export async function deployStablecoinFromConfig(
  configPath?: string,
): Promise<SssConfig> {
  const cfg = loadConfig(configPath);
  const filePath = configPath
    ? path.resolve(process.cwd(), configPath)
    : defaultConfigPath();

  if (cfg.stablecoin.mint && cfg.stablecoin.mint.trim() !== "") {
    throw new Error(
      "Config already has a mint address. Use a config with mint = \"\" to deploy a new token.",
    );
  }

  const connection = getConnection(cfg);
  const payer = loadKeypair(cfg.authorities.mint);
  const mintAuthority = payer.publicKey;
  const freezeKeypair = loadKeypair(cfg.authorities.freeze);
  const freezeAuthority = freezeKeypair.publicKey;
  const decimals = cfg.stablecoin.decimals;
  const name = cfg.stablecoin.name;
  const symbol = cfg.stablecoin.symbol;
  const uri = cfg.stablecoin.uri ?? "";

  const useToken2022 = cfg.stablecoin.tokenProgram === "spl-token-2022";
  const metadataEnabled =
    useToken2022 && (cfg.extensions?.metadata?.enabled === true);

  const programId = useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  console.log("=== SSS deploy ===");
  console.log("Standard:", cfg.standard);
  console.log("Cluster:", cfg.cluster);
  console.log("Token program:", cfg.stablecoin.tokenProgram);
  console.log(
    "Name / symbol / decimals:",
    name,
    symbol,
    decimals,
  );
  if (metadataEnabled) {
    console.log("Metadata extension: enabled (on-mint name, symbol, uri)");
  }
  console.log("");

  let mintAddress: string;

  if (metadataEnabled) {
    const metadataAuthority = loadKeypair(cfg.authorities.metadata).publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // Allocate only for MetadataPointer. tokenMetadataInitialize reallocs later.
    const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
    const lamports = await connection.getMinimumBalanceForRentExemption(
      ASSUMED_FINAL_MINT_SIZE,
    );

    const tx = new Transaction()
      .add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintSpace,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      )
      .add(
        createInitializeMetadataPointerInstruction(
          mint,
          metadataAuthority,
          mint,
          TOKEN_2022_PROGRAM_ID,
        ),
      )
      .add(
        createInitializeMint2Instruction(
          mint,
          decimals,
          mintAuthority,
          freezeAuthority,
          TOKEN_2022_PROGRAM_ID,
        ),
      );

    await sendAndConfirmTransaction(connection, tx, [payer, mintKeypair], {
      commitment: "confirmed",
    });

    await tokenMetadataInitialize(
      connection,
      payer,
      mint,
      metadataAuthority,
      payer,
      name,
      symbol,
      uri,
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );

    mintAddress = mint.toBase58();
  } else {
    const mint = await createMint(
      connection,
      payer,
      mintAuthority,
      freezeAuthority,
      decimals,
      undefined,
      undefined,
      programId,
    );
    mintAddress = mint.toBase58();
  }

  console.log("Created mint:", mintAddress);

  updateConfigMint(filePath, mintAddress);
  console.log("Updated config with mint address:", filePath);

  return {
    ...cfg,
    stablecoin: { ...cfg.stablecoin, mint: mintAddress },
  };
}
