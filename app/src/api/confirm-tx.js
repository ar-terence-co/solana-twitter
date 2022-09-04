import { useWorkspace } from "@/composables"

export const confirmTx = async (signature, commitment) => {
    const { connection } = useWorkspace()
    const latestBlockhash = await connection.getLatestBlockhash()
    const strategy = {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature,
    }
    return await connection.confirmTransaction(strategy, commitment)
}