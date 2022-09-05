import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";
import { parse as uuidParse } from "uuid";

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;
  const uuids = [
    "9944165c-fc9d-4047-897b-322e3a6973bb",
    "fb9b1142-9f30-4a3b-b09e-c27808127e5f",
    "59193c93-89f7-4fa0-b965-3ca64270fe5a",
    "10bcd7ac-2729-4faa-b52b-75677aaceaf4",
    "bac9a115-7139-48d2-8436-e001fb521a45",
  ];

  const airdropToAccount = async (publicKey: anchor.web3.PublicKey, lamports: number) => {
    const airdropSig = await program.provider.connection.requestAirdrop(publicKey, lamports);
    const latestBlockhash = await program.provider.connection.getLatestBlockhash();
    return await program.provider.connection.confirmTransaction({ 
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSig,
    });
  }

  it("can send a new tweet", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[0]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await program.methods.sendTweet("veganism", "Hummus, am I right?", uniqueSeed.toArray())
      .accounts({
        author: authorPublicKey,
        tweet: tweetPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweetPDA);
    
    assert.equal(tweetAccount.author.toBase58(), authorPublicKey.toBase58());
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Hummus, am I right?");
    assert.deepEqual(tweetAccount.uniqueSeed, uniqueSeed.toArray());
    assert.equal(tweetAccount.bump, bump);
    assert.ok(tweetAccount.createdTimestamp);
    assert.ok(tweetAccount.updatedTimestamp);
  });

  it("can send a new tweet without a topic", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[1]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await program.methods.sendTweet("", "gm", uniqueSeed.toArray())
      .accounts({
        author: authorPublicKey,
        tweet: tweetPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweetPDA);
    
    assert.equal(tweetAccount.author.toBase58(), authorPublicKey.toBase58());
    assert.equal(tweetAccount.topic, "");
    assert.equal(tweetAccount.content, "gm");
    assert.deepEqual(tweetAccount.uniqueSeed, uniqueSeed.toArray());
    assert.equal(tweetAccount.bump, bump);
    assert.ok(tweetAccount.createdTimestamp);
    assert.ok(tweetAccount.updatedTimestamp);
  });

  it("can send a new tweet from a different user", async () => {
    const otherUser = anchor.web3.Keypair.generate();
    await airdropToAccount(otherUser.publicKey, 1000000000);

    const uniqueSeed = new anchor.BN(uuidParse(uuids[2]));
    const authorPublicKey = otherUser.publicKey;
    const [tweetPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await program.methods.sendTweet("veganism", "Yay! Tofu!", uniqueSeed.toArray())
      .accounts({
        tweet: tweetPDA,
        author: authorPublicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherUser])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweetPDA);
    
    assert.equal(tweetAccount.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Yay! Tofu!");
    assert.deepEqual(tweetAccount.uniqueSeed, uniqueSeed.toArray());
    assert.equal(tweetAccount.bump, bump);
    assert.ok(tweetAccount.createdTimestamp);
    assert.ok(tweetAccount.updatedTimestamp);
  });

  it("can not provide a topic with more than 50 characters", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[3]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )
    const topicWith51Chars = 'x'.repeat(51);

    await assert.rejects(
      program.methods.sendTweet(topicWith51Chars, "gm", uniqueSeed.toArray())
        .accounts({
          tweet: tweetPDA,
          author: authorPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided topic should be 50 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 51-character topic.",
    );
  });

  it("can not provide a content with more than 280 characters", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[4]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )
    const contentWith51Chars = 'x'.repeat(281);

    await assert.rejects(
      program.methods.sendTweet("veganism", contentWith51Chars, uniqueSeed.toArray())
        .accounts({
          tweet: tweetPDA,
          author: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided content should be 280 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 281-character content.",
    );
  });

  it("can update a tweet", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[1]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await program.methods.updateTweet("sleep", "gn")
      .accounts({
        author: authorPublicKey,
        tweet: tweetPDA,
      })
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweetPDA);
    
    assert.equal(tweetAccount.author.toBase58(), authorPublicKey.toBase58());
    assert.equal(tweetAccount.topic, "sleep");
    assert.equal(tweetAccount.content, "gn");
    assert.deepEqual(tweetAccount.uniqueSeed, uniqueSeed.toArray());
    assert.equal(tweetAccount.bump, bump);
    assert.ok(tweetAccount.updatedTimestamp > tweetAccount.createdTimestamp);
  });

  it("can not update the tweet of a different user", async () => {
    const otherUser = anchor.web3.Keypair.generate();
    await airdropToAccount(otherUser.publicKey, 1000000000);

    const uniqueSeed = new anchor.BN(uuidParse(uuids[0]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await assert.rejects(
      program.methods.updateTweet("not-vegan", "Got milk?")
        .accounts({
          author: otherUser.publicKey,
          tweet: tweetPDA,
        })
        .signers([otherUser])
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "A seeds constraint was violated");
        return true;
      },
      "The author cannot update a different author's tweet.",
    );
  });

  it("can not update to a topic with more than 50 characters", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[0]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )
    const topicWith51Chars = 'x'.repeat(51);

    await assert.rejects(
      program.methods.updateTweet(topicWith51Chars, "Yay! Tofu!")
        .accounts({
          tweet: tweetPDA,
          author: authorPublicKey,
        })
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided topic should be 50 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 51-character topic.",
    );
  });

  it("can not update to content with more than 280 characters", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[0]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )
    const contentWith51Chars = 'x'.repeat(281);

    await assert.rejects(
      program.methods.updateTweet("veganism", contentWith51Chars)
        .accounts({
          tweet: tweetPDA,
          author: program.provider.publicKey,
        })
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided content should be 280 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 281-character content.",
    );
  });

  it("can fetch all tweets", async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length, 3);
  });

  it("can filter tweets by author", async () => {
    const authorPublicKey = program.provider.publicKey;
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, //Discriminator offset,
          bytes: authorPublicKey.toBase58(),
        }
      }
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => 
      tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
    ));
  });

  it("can filter tweets by topics", async () => {
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8 + 32 + 8 + 8 + 4, // Discriminator + Author + Timestamp + Topic Length
          bytes: bs58.encode(Buffer.from("veganism")),
        }
      }
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => 
      tweetAccount.account.topic === "veganism"
    ));
  });

  it("can delete a tweet", async () => {
    const uniqueSeed = new anchor.BN(uuidParse(uuids[1]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await program.methods.deleteTweet()
      .accounts({
        author: authorPublicKey,
        tweet: tweetPDA,
      })
      .rpc();

    const tweetAccount = await program.account.tweet.fetchNullable(tweetPDA);
    assert.equal(tweetAccount, null);
  });

  it("can not delete the tweet of a different user", async () => {
    const otherUser = anchor.web3.Keypair.generate();
    await airdropToAccount(otherUser.publicKey, 1000000000);

    const uniqueSeed = new anchor.BN(uuidParse(uuids[0]));
    const authorPublicKey = program.provider.publicKey;
    const [tweetPDA,] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), authorPublicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.programId,
    )

    await assert.rejects(
      program.methods.deleteTweet()
        .accounts({
          author: otherUser.publicKey,
          tweet: tweetPDA,
        })
        .signers([otherUser])
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "A seeds constraint was violated");
        return true;
      },
      "The author cannot delete a different author's tweet.",
    );
  });
});
