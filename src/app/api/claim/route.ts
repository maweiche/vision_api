import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import { SDK } from '@maweiche/react-sdk';
import base58, * as bs58 from "bs58";
export const maxDuration = 86400000
export async function POST(request: Request) {
    let sdk: SDK;
    try{
        const body = await request.json();
        
        const collectionOwner = new PublicKey(body.collectionOwner);
        const buyer = new PublicKey(body.publicKey);
        
        // CREATE A curl command with the above body to this endpoint
        // curl -X POST http://localhost:3000/api/claim -H "Content-Type: application/json" -d '{"collectionOwner": "6DgMcaPTjSvgSkPfNN71u1i1T1fmfYAbLovE1MgJ1kq9", "publicKey": "DEVJb1nq3caksGybAFxoxsYXLi9nyp8ZQnmAFmfAYMSN"}'
        // curl -X POST https://vision-api-ecru.vercel.app/api/claim -H "Content-Type: application/json" -d '{"collectionOwner": "6DgMcaPTjSvgSkPfNN71u1i1T1fmfYAbLovE1MgJ1kq9", "publicKey": "DEVJb1nq3caksGybAFxoxsYXLi9nyp8ZQnmAFmfAYMSN"}'

        const keypair1 = process.env.ADMINKEYPAIR as string;

        const admin = Keypair.fromSecretKey(base58.decode(keypair1));

        const adminWallet = new NodeWallet(admin);

        
        
        const connection = new Connection(process.env.RPC!, 'confirmed')

        sdk = new SDK(
            adminWallet as NodeWallet,
            connection,
            { skipPreflight: true},
            "mainnet-beta",
        );

        const collection = PublicKey.findProgramAddressSync([Buffer.from('collection'), collectionOwner.toBuffer()], sdk.program.programId)[0];
        console.log('collection', collection.toBase58())
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
        console.log('account total', accounts.length)
        const completedTxns = [];
        if( accounts.length === 0 ) {
            return new Response(JSON.stringify({
                txn_signature: []
            }), { status: 200 });
        }

        const all_token_ids = [];

        for( let i = 0; i < accounts.length; i++ ) {
            //Parse the account data
            const parsedAccountInfo:any = accounts[i].account.data;
            const mintAddress:string = parsedAccountInfo["parsed"]["info"]["mint"];
            const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
    
            const _token_metadata = await getTokenMetadata(sdk.rpcConnection, new PublicKey(mintAddress));
    
            if (_token_metadata!.additionalMetadata.length < 6  || tokenBalance == 0  ) {
              continue;
            }
            console.log('all additional metadata', _token_metadata!.additionalMetadata)
            const collection_key = _token_metadata!.additionalMetadata[5][1]
    
            //Log results
            // console.log(`Token Account No. ${i + 1}: ${accounts[i].pubkey.toString()}`);
            // console.log(`--Token Mint: ${mintAddress}`);
            // console.log(`--Token Balance: ${tokenBalance}`);
            // console.log(`--Collection Key: ${collection_key}`);
    
            if( collection_key === collection.toBase58() ) {
                console.log('We have a match: ', mintAddress)

                const placeholder_mint = new PublicKey(mintAddress);
                const placeholder_metadata = await getTokenMetadata(connection, placeholder_mint);
                console.log('placeholder_metadata', placeholder_metadata)
                
                const additional_metadata = _token_metadata!.additionalMetadata;
                const _mint = additional_metadata[0][1];
                const token_id = additional_metadata[1][1];
                console.log('placeholder mint', placeholder_mint);
                console.log('placeholder token id', token_id);


                all_token_ids.push({
                    ref_id: _mint,
                    token_id: token_id
                });
            }
        }

        console.log('all token ids', all_token_ids)

        // sort the all_token_ids array and grab the element with the lowest token_id ex. [5, 3, 8, 9, 2, 1] => [1, 2, 3, 5, 8, 9]
        console.log('all_token_ids', all_token_ids)

        all_token_ids.sort((a, b) => parseInt(a.token_id) - parseInt(b.token_id));

        console.log('all_token ids after sort', all_token_ids)

        const {token_id, ref_id }= all_token_ids[0];
        
        console.log('smallest token_id', token_id , 'ref id', ref_id)
        const placeholder = PublicKey.findProgramAddressSync([Buffer.from('placeholder'), collection.toBuffer(), new anchor.BN(ref_id).toBuffer("le", 8)], sdk.program.programId)[0];
        const placeholder_mint = PublicKey.findProgramAddressSync([Buffer.from('mint'), placeholder.toBuffer()], sdk.program.programId)[0];
      
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
                new PublicKey(placeholder_mint) // placeholder mint address
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
