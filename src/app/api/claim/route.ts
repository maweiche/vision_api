import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";

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

        const completedTxns = [];
        if( accounts.length === 0 ) {
            return new Response(JSON.stringify({
                txn_signature: []
            }), { status: 200 });
        }

        const all_token_ids = [];

        for( let i = 0; i < accounts.length; i++ ) {
            //Parse the account data
            const parsedAccountInfo:any = accounts[0].account.data;
            const mintAddress:string = parsedAccountInfo["parsed"]["info"]["mint"];
            const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
    
            const _token_metadata = await getTokenMetadata(sdk.rpcConnection, new PublicKey(mintAddress));
    
            if (_token_metadata!.additionalMetadata.length < 6  || tokenBalance == 0  ) {
                return new Response(JSON.stringify({
                    transactions: []
                }), { status: 200 });
            }
    
            const collection_key = _token_metadata!.additionalMetadata[5][1]
    
            //Log results
            console.log(`Token Account No. ${0 + 1}: ${accounts[0].pubkey.toString()}`);
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

                all_token_ids.push({
                    token_id: token_id,
                    placeholder_mint: placeholder_mint,
                })
            }

        }

        // sort the all_token_ids array and grab the element with the lowest token_id
        all_token_ids.sort((a: any, b: any) => a.token_id - b.token_id);
        const { token_id, placeholder_mint } = all_token_ids[0];
     

            const getCollectionUrl = async(collection: PublicKey) => {
                const collection_data = await connection.getAccountInfo(collection);
                const collection_decode = sdk.program.coder.accounts.decode("Collection", collection_data!.data);
                console.log('collection_decode', collection_decode)
                return {
                    url: collection_decode.url,
                    count: collection_decode.mintCount.toNumber(),
                    owner: collection_decode.owner,
                }
            }
            const { url, owner } = await getCollectionUrl(collection);
            console.log('URL TO POLL: ',`${url}/${token_id}/${buyer.toBase58()}`)


            
            const {tx_signature, nft_mint} = await sdk.nft.createNft(
                connection,  // connection: Connection,
                process.env.BEARER!, // bearer
                admin, // admin
                collectionOwner, // collection owner
                buyer, // buyer    
                placeholder_mint // placeholder mint address
            ); // returns txn signature and nft mint address
    

            console.log(`nft mint: ${nft_mint}`);

            console.log(`nft tx url: https://explorer.solana.com/tx/${tx_signature}?cluster=${sdk.cluster}`);

            const _tx_obj = {
                tx_signature: tx_signature as string,
                nft_mint: nft_mint as string,
            }
    

        return new Response(JSON.stringify(_tx_obj), { status: 200 });
    } catch (error) {
        return new Response(error as string, { status: 500 });
    }
}
