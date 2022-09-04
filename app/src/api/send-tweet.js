import { web3 } from "@project-serum/anchor"
import { useWorkspace } from "@/composables"
import { Tweet } from "@/models"

import { confirmTx } from "./confirm-tx"

export const sendTweet = async (topic, content) => {
    const { wallet, program } = useWorkspace()
    const tweet = web3.Keypair.generate()

    const txSignature = await program.value.methods.sendTweet(topic, content)
        .accounts({
            tweet: tweet.publicKey,
            author: wallet.value.publicKey,
            systemProgram: web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc()

    await confirmTx(txSignature, 'processed')
    
    const tweetAccount = await program.value.account.tweet.fetch(tweet.publicKey, 'processed')
    return new Tweet(tweet.publicKey, tweetAccount)
}
