import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { Blacklist } from "../target/types/blacklist";

describe("blacklist", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Blacklist as Program<Blacklist>;

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId,
  );

  it("initializes config with authority", async () => {
    await program.methods
      .initialize()
      .accounts({
        authority: provider.wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const config = await program.account.config.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(
      provider.wallet.publicKey.toBase58(),
    );
  });

  it("blacklists and unblacklists an account", async () => {
    const target = anchor.web3.Keypair.generate().publicKey;
    const [entryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), target.toBuffer()],
      program.programId,
    );

    // blacklist
    await program.methods
      .blacklistAccount()
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        accountToBlacklist: target,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const entry = await program.account.blacklistEntry.fetch(entryPda);
    expect(entry.account.toBase58()).to.equal(target.toBase58());

    // unblacklist (closes the entry PDA)
    await program.methods
      .unblacklistAccount()
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        accountToBlacklist: target,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const info = await provider.connection.getAccountInfo(entryPda);
    expect(info).to.be.null;
  });

  it("rejects blacklist calls from non-authority", async () => {
    const fakeAuthority = anchor.web3.Keypair.generate();
    const target = anchor.web3.Keypair.generate().publicKey;
    const [entryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), target.toBuffer()],
      program.programId,
    );

    let threw = false;
    try {
      await program.methods
        .blacklistAccount()
        .accounts({
          config: configPda,
          authority: fakeAuthority.publicKey,
          accountToBlacklist: target,
          entry: entryPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([fakeAuthority])
        .rpc();
    } catch {
      threw = true;
    }
    expect(threw).to.be.true;
  });
});

