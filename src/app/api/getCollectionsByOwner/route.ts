import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";

export async function POST(request: Request) {
    let sdk: SDK;
    try{
        const body = await request.json();
        const collectionOwner = new PublicKey(body.collectionOwner);

        // CREATE A curl command with the above body to this endpoint
        // curl -X POST https://vision-api-ecru.vercel.app/api/getCollectionsByOwner -H "Content-Type: application/json" -d '{"collectionOwner": "6KuX26FZqzqpsHDLfkXoBXbQRPEDEbstqNiPBKHNJQ9e"}'

        const keypair1 = process.env.ADMINKEYPAIR as string;

        const admin = Keypair.fromSecretKey(base58.decode(keypair1));

        const adminWallet = new NodeWallet(admin);
        
        const connection = new Connection(process.env.RPC!, 'confirmed')

        sdk = new SDK(
            adminWallet as NodeWallet,
            connection,
            { skipPreflight: true},
            "devnet",
        );
        const collection = await sdk.collection.getCollectionByOwner(
            connection, // connection
            collectionOwner // owner
          )
        console.log('data', collection);

        
        return new Response(JSON.stringify({
            collection
        }), { status: 200 });
    } catch (error) {
        return new Response(error as string, { status: 500 });
    }
}
