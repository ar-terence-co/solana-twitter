import { useWorkspace } from "@/composables"
import { Tweet } from "@/models"
import { PublicKey } from "@solana/web3.js"

import { confirmTx } from "./confirm-tx"

export const updateTweet = async (publicKey, topic, content) => {
    const { wallet, program } = useWorkspace()

    const txSignature = await program.value.methods.updateTweet(topic, content)
        .accounts({
            tweet: publicKey,
            author: wallet.value.publicKey,
        })
        .rpc()

    await confirmTx(txSignature, 'processed')
    
    const tweetAccount = await program.value.account.tweet.fetch(publicKey, 'processed')
    return new Tweet(new PublicKey(publicKey), tweetAccount)
}
