import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

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
    const tweet = anchor.web3.Keypair.generate();
    await program.methods.sendTweet("veganism", "Hummus, am I right?")
      .accounts({
        tweet: tweet.publicKey,
        author: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    
    assert.equal(tweetAccount.author.toBase58(), program.provider.publicKey.toBase58());
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Hummus, am I right?");
    assert.ok(tweetAccount.timestamp);
  });

  it("can send a new tweet without a topic", async () => {
    const tweet = anchor.web3.Keypair.generate();
    await program.methods.sendTweet("", "gm")
      .accounts({
        tweet: tweet.publicKey,
        author: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    
    assert.equal(tweetAccount.author.toBase58(), program.provider.publicKey.toBase58());
    assert.equal(tweetAccount.topic, "");
    assert.equal(tweetAccount.content, "gm");
    assert.ok(tweetAccount.timestamp);
  });

  it("can send a new tweet from a different user", async () => {
    const otherUser = anchor.web3.Keypair.generate();
    await airdropToAccount(otherUser.publicKey, 1000000000);

    const tweet = anchor.web3.Keypair.generate();
    await program.methods.sendTweet("veganism", "Yay! Tofu!")
      .accounts({
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherUser, tweet])
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    
    assert.equal(tweetAccount.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Yay! Tofu!");
    assert.ok(tweetAccount.timestamp);
  });

  it("can not provide a topic with more than 50 characters", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const topicWith51Chars = 'x'.repeat(51);

    await assert.rejects(
      program.methods.sendTweet(topicWith51Chars, "gm")
        .accounts({
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided topic should be 50 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 51-character topic.",
    );
  });

  it("can not provide a content with more than 280 characters", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const contentWith51Chars = 'x'.repeat(281);

    await assert.rejects(
      program.methods.sendTweet("veganism", contentWith51Chars)
        .accounts({
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc(),
      (err: AnchorError) => {
        assert.equal(err.error.errorMessage, "The provided content should be 280 characters long maximum.");
        return true;
      },
      "The instruction should have failed with a 281-character content.",
    );
  });
});
