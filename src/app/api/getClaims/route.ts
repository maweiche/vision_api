import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

export async function POST(request: Request) {
    let sdk: SDK;
    try{
        const body = await request.json();
        
        const collectionOwner = new PublicKey(body.collectionOwner);
        const buyer = new PublicKey(body.publicKey);
        
        // CREATE A curl command with the above body to this endpoint
        // curl -X POST http://localhost:3000/api/finalize -H "Content-Type: application/json" -d '{"collectionOwner": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7", "publicKey": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7", "placeholderMint": "9p2Zp5Uf5xGJ7rV7t2r1fQ8LwX7c9Zr7v7v7v7v7v7"}'

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

        const collection = PublicKey.findProgramAddressSync([Buffer.from('collection'), collectionOwner.toBuffer()], sdk.program.programId)[0];

        const filters:GetProgramAccountsFilter[] = [
            {
              dataSize: 170,    //size of account (bytes)
            },
            {
              memcmp: {
                offset: 32,     //location of our query in the account (bytes)
                bytes: buyer.toBase58(),  //our search criteria, a base58 encoded string
              },            
            }];
        const accounts = await sdk.rpcConnection.getParsedProgramAccounts(
            TOKEN_2022_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            {filters: filters}
        );

        const _tokenIds = [];

        for( let i = 0; i < accounts.length; i++ ) {
            //Parse the account data
            const parsedAccountInfo:any = accounts[i].account.data;
            const mintAddress:string = parsedAccountInfo["parsed"]["info"]["mint"];
            const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
    
            const _token_metadata = await getTokenMetadata(sdk.rpcConnection, new PublicKey(mintAddress));
    
            if (_token_metadata!.additionalMetadata.length < 6  || tokenBalance == 0  ) {
              continue;
            }
    
            const collection_key = _token_metadata!.additionalMetadata[5][1]
    
            //Log results
            console.log(`Token Account No. ${i + 1}: ${accounts[i].pubkey.toString()}`);
            console.log(`--Token Mint: ${mintAddress}`);
            console.log(`--Token Balance: ${tokenBalance}`);
            console.log(`--Collection Key: ${collection_key}`);
    
            if( collection_key === collection.toBase58() ) {
                console.log('We have a match: ', mintAddress)

                const placeholder_mint = new PublicKey(mintAddress);
                const placeholder_metadata = await getTokenMetadata(connection, placeholder_mint);
                console.log('placeholder_metadata', placeholder_metadata)
                
                const additional_metadata = _token_metadata!.additionalMetadata;
                const token_id = additional_metadata[1][1];
                console.log('placeholder mint', placeholder_mint);
                console.log('placeholder token id', token_id);


                _tokenIds.push(token_id);
            }
        }

        return new Response(JSON.stringify({
            tokens: _tokenIds
        }), { status: 200 });
    } catch (error) {
        return new Response(error as string, { status: 500 });
    }
}