import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SendTransactionError,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  createInitializeTransferHookInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  createTransferCheckedWithTransferHookInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("blacklist_hook", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BlacklistHook as Program<any>;
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;

  const decimals = 9;
  const mintAuthority = admin.publicKey;

  let mint: Keypair;
  let sender: Keypair;
  let recipient: Keypair;
  let blocked: Keypair;

  let senderAta: PublicKey;
  let recipientAta: PublicKey;
  let blockedAta: PublicKey;

  let configPda: PublicKey;
  let extraAccountMetaListPda: PublicKey;
  let senderBlacklistPda: PublicKey;
  let recipientBlacklistPda: PublicKey;
  let blockedBlacklistPda: PublicKey;

  const CONFIG_SEED = Buffer.from("config");
  const BLACKLIST_SEED = Buffer.from("blacklist");
  const EXTRA_METAS_SEED = Buffer.from("extra-account-metas");

  before(async () => {
    mint = Keypair.generate();
    sender = Keypair.generate();
    recipient = Keypair.generate();
    blocked = Keypair.generate();

    for (const kp of [sender, recipient, blocked]) {
      const sig = await connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig, "confirmed");
    }

    [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_SEED, mint.publicKey.toBuffer()],
      program.programId
    );

    [extraAccountMetaListPda] = PublicKey.findProgramAddressSync(
      [EXTRA_METAS_SEED, mint.publicKey.toBuffer()],
      program.programId
    );

    [senderBlacklistPda] = PublicKey.findProgramAddressSync(
      [BLACKLIST_SEED, sender.publicKey.toBuffer()],
      program.programId
    );

    [recipientBlacklistPda] = PublicKey.findProgramAddressSync(
      [BLACKLIST_SEED, recipient.publicKey.toBuffer()],
      program.programId
    );

    [blockedBlacklistPda] = PublicKey.findProgramAddressSync(
      [BLACKLIST_SEED, blocked.publicKey.toBuffer()],
      program.programId
    );

    senderAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      sender.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    recipientAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      recipient.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    blockedAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      blocked.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  });

  async function createTransferWithHookIx(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: bigint
  ) {
    return await createTransferCheckedWithTransferHookInstruction(
      connection,
      source,
      mint.publicKey,
      destination,
      owner,
      amount,
      decimals,
      [],
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
  }

  async function expectTransferToFail(
    source: PublicKey,
    destination: PublicKey,
    ownerSigner: Keypair,
    amount: bigint
  ) {
    const ix = await createTransferWithHookIx(
      source,
      destination,
      ownerSigner.publicKey,
      amount
    );
    const tx = new Transaction().add(ix);
  
    let failed = false;
    try {
      await sendAndConfirmTransaction(connection, tx, [ownerSigner], {
        commitment: "confirmed",
      });
    } catch (e: any) {
      failed = true;
  
      const logs = e?.logs;
      if (Array.isArray(logs)) {
        console.log(logs.join("\n"));
      }
    }
  
    assert.isTrue(failed, "expected transfer to fail");
  }

  it("creates mint with transfer hook extension", async () => {
    const extensions = [ExtensionType.TransferHook];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: admin.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeTransferHookInstruction(
        mint.publicKey,
        admin.publicKey,
        program.programId,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, tx, [admin, mint], {
      commitment: "confirmed",
    });
  });

  it("initializes config PDA", async () => {
    await program.methods
      .initializeConfig()
      .accounts({
        admin: admin.publicKey,
        mint: mint.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.admin.toBase58(), admin.publicKey.toBase58());
    assert.equal(config.mint.toBase58(), mint.publicKey.toBase58());
  });

  it("creates token accounts and mints tokens", async () => {
    const mintAmount = BigInt(100) * BigInt(10 ** decimals);

    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        senderAta,
        sender.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        recipientAta,
        recipient.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        admin.publicKey,
        blockedAta,
        blocked.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createMintToInstruction(
        mint.publicKey,
        senderAta,
        mintAuthority,
        mintAmount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "confirmed",
    });

    const senderAccount = await getAccount(
      connection,
      senderAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );

    assert.equal(senderAccount.amount.toString(), mintAmount.toString());
  });

  it("creates extra account meta list", async () => {
    await program.methods
      .initializeExtraAccountMetaList()
      .accounts({
        payer: admin.publicKey,
        mint: mint.publicKey,
        config: configPda,
        extraAccountMetaList: extraAccountMetaListPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const extraMetaAcc = await connection.getAccountInfo(extraAccountMetaListPda);
    assert.isNotNull(extraMetaAcc);
  });

  it("initializes blacklist PDAs in unblocked state", async () => {
    for (const [wallet, blacklistPda] of [
      [sender.publicKey, senderBlacklistPda],
      [recipient.publicKey, recipientBlacklistPda],
      [blocked.publicKey, blockedBlacklistPda],
    ] as [PublicKey, PublicKey][]) {
      await program.methods
        .removeFromBlacklist(wallet)
        .accounts({
          admin: admin.publicKey,
          mint: mint.publicKey,
          config: configPda,
          blacklistEntry: blacklistPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }

    const senderEntry = await program.account.blacklistEntry.fetch(senderBlacklistPda);
    const recipientEntry = await program.account.blacklistEntry.fetch(recipientBlacklistPda);
    const blockedEntry = await program.account.blacklistEntry.fetch(blockedBlacklistPda);

    assert.equal(senderEntry.blocked, false);
    assert.equal(recipientEntry.blocked, false);
    assert.equal(blockedEntry.blocked, false);
  });

  it("allows transfer when neither side is blacklisted", async () => {
    const amount = BigInt(5) * BigInt(10 ** decimals);

    const ix = await createTransferWithHookIx(
      senderAta,
      recipientAta,
      sender.publicKey,
      amount
    );

    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [sender], {
      commitment: "confirmed",
    });

    const senderAccount = await getAccount(
      connection,
      senderAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    const recipientAccount = await getAccount(
      connection,
      recipientAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );

    assert.equal(
      senderAccount.amount.toString(),
      (BigInt(95) * BigInt(10 ** decimals)).toString()
    );
    assert.equal(recipientAccount.amount.toString(), amount.toString());
  });

  it("blocks transfer to a blacklisted recipient", async () => {
    await program.methods
      .addToBlacklist(blocked.publicKey)
      .accounts({
        admin: admin.publicKey,
        mint: mint.publicKey,
        config: configPda,
        blacklistEntry: blockedBlacklistPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
  
    const blockedEntry = await program.account.blacklistEntry.fetch(blockedBlacklistPda);
    assert.equal(blockedEntry.blocked, true);
  
    const amount = BigInt(1) * BigInt(10 ** decimals);
    await expectTransferToFail(senderAta, blockedAta, sender, amount);
  
    const blockedAccount = await getAccount(
      connection,
      blockedAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
  
    assert.equal(blockedAccount.amount.toString(), "0");
  });

  it("blocks transfer from a blacklisted sender", async () => {
    await program.methods
      .addToBlacklist(sender.publicKey)
      .accounts({
        admin: admin.publicKey,
        mint: mint.publicKey,
        config: configPda,
        blacklistEntry: senderBlacklistPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const entry = await program.account.blacklistEntry.fetch(senderBlacklistPda);
    assert.equal(entry.blocked, true);

    const amount = BigInt(1) * BigInt(10 ** decimals);
    await expectTransferToFail(senderAta, recipientAta, sender, amount);
  });

  it("allows transfer again after removing sender from blacklist", async () => {
    for (const [wallet, blacklistPda] of [
      [sender.publicKey, senderBlacklistPda],
      [recipient.publicKey, recipientBlacklistPda],
      [blocked.publicKey, blockedBlacklistPda],
    ] as [PublicKey, PublicKey][]) {
      await program.methods
        .removeFromBlacklist(wallet)
        .accounts({
          admin: admin.publicKey,
          mint: mint.publicKey,
          config: configPda,
          blacklistEntry: blacklistPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }
  
    const senderEntry = await program.account.blacklistEntry.fetch(senderBlacklistPda);
    const recipientEntry = await program.account.blacklistEntry.fetch(recipientBlacklistPda);
    const blockedEntry = await program.account.blacklistEntry.fetch(blockedBlacklistPda);
  
    assert.equal(senderEntry.blocked, false);
    assert.equal(recipientEntry.blocked, false);
    assert.equal(blockedEntry.blocked, false);
  
    const amount = BigInt(2) * BigInt(10 ** decimals);
  
    const ix = await createTransferWithHookIx(
      senderAta,
      recipientAta,
      sender.publicKey,
      amount
    );
  
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [sender], {
      commitment: "confirmed",
    });
  
    const recipientAccount = await getAccount(
      connection,
      recipientAta,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
  
    assert.equal(
      recipientAccount.amount.toString(),
      (BigInt(7) * BigInt(10 ** decimals)).toString()
    );
  });
});