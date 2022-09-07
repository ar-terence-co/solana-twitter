import { useWorkspace } from "@/composables"

import { confirmTx } from "./confirm-tx"

export const deleteTweet = async (publicKey) => {
    const { wallet, program } = useWorkspace()

    const txSignature = await program.value.methods.deleteTweet()
        .accounts({
            tweet: publicKey,
            author: wallet.value.publicKey,
        })
        .rpc()

    await confirmTx(txSignature, 'processed')
}
