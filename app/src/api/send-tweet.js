import { web3, BN } from "@project-serum/anchor"
import { useWorkspace } from "@/composables"
import { Tweet } from "@/models"
import { v4 as uuidV4, parse as uuidParse } from "uuid"

import { confirmTx } from "./confirm-tx"

export const sendTweet = async (topic, content) => {
    const { wallet, program } = useWorkspace()
    
    const uniqueSeed = new BN(uuidParse(uuidV4()))
    const [tweetPDA,] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("tweet"), wallet.value.publicKey.toBuffer(), uniqueSeed.toArrayLike(Buffer)], 
      program.value.programId,
    )

    const txSignature = await program.value.methods.sendTweet(topic, content, uniqueSeed.toArray())
        .accounts({
            tweet: tweetPDA,
            author: wallet.value.publicKey,
            systemProgram: web3.SystemProgram.programId,
        })
        .rpc()

    await confirmTx(txSignature, 'processed')
    
    const tweetAccount = await program.value.account.tweet.fetch(tweetPDA, 'processed')
    return new Tweet(tweetPDA, tweetAccount)
}
