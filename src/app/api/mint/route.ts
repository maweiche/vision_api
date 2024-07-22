import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, Connection, PublicKey, Transaction } from '@solana/web3.js';
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";

export async function POST(request: Request) {
    let sdk: SDK;
    try{
        const body = await request.json();
        const id = body.id;
        const collectionOwner = new PublicKey(body.collectionOwner);
        

        const keypair1 = process.env.ADMINKEYPAIR as string;
        const admin = Keypair.fromSecretKey(base58.decode(keypair1));
        const adminWallet = new NodeWallet(admin);
        const buyer = new PublicKey(body.publicKey);
        
        const connection = new Connection(process.env.RPC!, 'confirmed')

        sdk = new SDK(
            adminWallet as NodeWallet,
            connection,
            { skipPreflight: true},
            "mainnet-beta",
        );
        const data = await sdk.placeholder.createPlaceholder(
            admin,
            collectionOwner,
            buyer,
            id,
        );

        const tx = new Transaction(
            {
                feePayer: buyer,
                recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
            }
        );

        tx.add(...data.instructions)
        tx.partialSign(admin);
        const serializedTransaction = tx.serialize({
            requireAllSignatures: false,
        });

        const base64 = serializedTransaction.toString("base64");
        const base64JSON = JSON.stringify(base64);

        return new Response(JSON.stringify({
            transaction: base64JSON as string,
            placeholder_mint: data.placeholder_mint.toBase58() as string,
        }), { status: 200 });
    } catch (error) {
        return new Response(error as string, { status: 500 });
    }
}
