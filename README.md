# API Endpoints for Vision SDK

### /api/getCollectionsByOwner

POST BODY: 
```tsx
{
    collectionOwner: string
}
```

RESPONSE: 
```tsx
{
    "collection": {
        "reference":"mwUt7aCktvBeSm8bry6TvqEcNSUGtxByKCbBKfkxAzA",
        "name":"Test 12 Collection",
        "symbol":"TS5T",
        "owner":"6KuX26FZqzqpsHDLfkXoBXbQRPEDEbstqNiPBKHNJQ9e",
        "url":"https://amin.stable-dilution.art/nft/item/generation/3/",
        "saleStartTime":"01909d8d76c3",
        "saleEndTime":"0190a2b3d2c3",
        "maxSupply":"64",
        "totalSupply":"0e",
        "mintCount":"01",
        "price":1,
        "stableId":"TS2233321T"
    }
}
```


### /api/claim

POST BODY: 
```tsx
{
    collectionOwner: string
    publicKey: string // user
}
```

RESPONSE: 
```tsx
{
    "transactions": [{
        "tx_signature": "123565432345",
        "nft_mint": "12345654"
    }]
}
```

### /api/mint

POST BODY: 
```tsx
{
    id: number;
    collectionOwner: string
    publicKey: string // user
}
```

RESPONSE: 
```tsx
{
    "transactions": [{
        "tx_signature": "123565432345",
        "placeholder_mint": "12345654"
    }]
}
```

### /api/finalize

POST BODY: 
```tsx
{
    collectionOwner: string,
    placeholder_mint: string
}
```

RESPONSE: 
```tsx
{
    "transactions": [{
        "tx_signature": "123565432345",
        "nft_mint": "12345654"
    }]
}
```