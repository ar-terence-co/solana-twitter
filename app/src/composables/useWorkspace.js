import { computed } from 'vue'
import { useAnchorWallet } from 'solana-wallets-vue'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program } from '@project-serum/anchor'
import idl from '@/idl/solana_twitter.json'

const programID = new PublicKey(idl.metadata.address)
let workspace = null

export const useWorkspace = () => workspace

export const initWorkspace = () => {
    const wallet = useAnchorWallet()
    const preflightCommitment = 'processed'
    const commitment = 'processed'
    const clusterUrl = process.env.VUE_APP_CLUSTER_URL
    const connection = new Connection(clusterUrl, commitment)
    const provider = computed(() => {
        if (wallet.value == null) return { connection }
        return new AnchorProvider(
            connection, 
            wallet.value, 
            { preflightCommitment, commitment }
        )
    })
    const program = computed(() => new Program(idl, programID, provider.value))

    workspace = { 
        wallet ,
        connection,
        provider,
        program,
    }
}