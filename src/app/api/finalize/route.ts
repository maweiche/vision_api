import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";

export async function POST(request: Request) {
    let sdk: SDK;
    try{
        console.log('request', request);
        const body = await request.json();
        console.log('body', body);
        const collectionOwner = new PublicKey(body.collectionOwner);
        const placeholderMint = new PublicKey(body.placeholderMint);

        // CREATE A curl command with the above body to this endpoint
        // curl -X POST http://localhost:3000/api/finalize -H "Content-Type: application/json" -d '{"collectionOwner": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7", "publicKey": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7", "placeholderMint": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7"}'

        const keypair1 = process.env.ADMINKEYPAIR as string;

        const admin = Keypair.fromSecretKey(base58.decode(keypair1));

        const adminWallet = new NodeWallet(admin);

        const buyer = new PublicKey(body.publicKey);
        
        const connection = new Connection(process.env.RPC!, 'confirmed')

        sdk = new SDK(
            adminWallet as NodeWallet,
            connection,
            { skipPreflight: true},
            "devnet",
        );
        const {tx_signature, nft_mint} = await sdk.nft.createNft(
            connection,  // connection: Connection,
            process.env.BEARER!, // bearer
            adminWallet.payer, // admin
            collectionOwner, // collection owner
            buyer, // buyer    
            placeholderMint // placeholder mint address
        ); // returns txn signature and nft mint address

        console.log(`nft mint: ${nft_mint}`);

        console.log(`nft tx url: https://explorer.solana.com/tx/${tx_signature}?cluster=${sdk.cluster}`);

        return new Response(JSON.stringify({
            tx_signature: tx_signature as string,
            nft_mint: nft_mint as string,
        }), { status: 200 });
    } catch (error) {
        return new Response(error as string, { status: 500 });
    }
}
