import chalk from "chalk";
import { Client, convertStringToHex, NFTokenCreateOfferFlags, NFTokenMint, NFTokenMintFlags, Wallet } from "xrpl"
import { NFTokenMintMetadata } from "xrpl/dist/npm/models/transactions/NFTokenMint";

export async function nft() {
    console.log(chalk.bgRed('\n-- NFT --'));
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: wallet } = await client.fundWallet();
    console.log(`Wallet: ${chalk.green(wallet.classicAddress)}\n`);


    // Mint an NFT
    console.log(chalk.bgWhite("-- MINT NFT --"));
    const nftMintTx: NFTokenMint = {
        TransactionType: "NFTokenMint",
        Account: wallet.address,
        URI: convertStringToHex("https://arweave.net/FSx_bzz0bMjM108uKKlU76jhGbVuyI1NTIvrLCqYnUI"),
        Flags: NFTokenMintFlags.tfBurnable + NFTokenMintFlags.tfTransferable, // Burnable in case no one is buying it
        NFTokenTaxon: 0, // Collection ID
    }

    const preparedMintTx = await client.autofill(nftMintTx);
    const resultMintTx = await client.submitAndWait(preparedMintTx, {
        wallet: wallet
    });

    const nftId = (resultMintTx.result.meta as NFTokenMintMetadata)?.nftoken_id as string;
    console.log(`✅ NFT #${nftId} created. Tx: ${resultMintTx.result.hash}\n`);

    // Put the NFT on sale
    console.log(chalk.bgWhite("-- CREATE NFT OFFER --"));
    const nftCreateOfferTx = {
        TransactionType: "NFTokenCreateOffer" as const,
        Account: wallet.address,
        // Destination: "", // Replace with the address of the recipient, only claimable by the recipient
        NFTokenID: nftId,
        Amount: "1", // 0 would represent a gift to someone
        Flags: NFTokenCreateOfferFlags.tfSellNFToken // Sell offer
    }

    const preparedCreateOfferTx = await client.autofill(nftCreateOfferTx);
    const resultCreateOfferTx = await client.submitAndWait(preparedCreateOfferTx, {
        wallet: wallet
    });
    const offerId = (resultCreateOfferTx.result.meta as NFTokenMintMetadata)?.offer_id as string;

    if (resultCreateOfferTx.result.validated)
        console.log(`✅🛒 NFT #${nftId} put on sale with offer #${offerId}. Tx: ${resultCreateOfferTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating offer: ${resultCreateOfferTx}\n`));

    // Cancel the offer
    console.log(chalk.bgWhite("-- CANCEL NFT OFFER --"));
    const nftCancelOfferTx = {
        TransactionType: "NFTokenCancelOffer" as const,
        Account: wallet.address,
        // Destination: "", // Replace with the address of the recipient, only claimable by the recipient
        NFTokenOffers: [offerId]
    }

    const preparedCancelOfferTx = await client.autofill(nftCancelOfferTx);
    const resultCancelOfferTx = await client.submitAndWait(preparedCancelOfferTx, {
        wallet: wallet
    });

    if (resultCancelOfferTx.result.validated)
        console.log(`✅↩️ Offer canceled for NFT #${nftId}. Tx: ${resultCancelOfferTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error canceling offer: ${resultCancelOfferTx}\n`));

    // Burn the NFT
    console.log(chalk.bgWhite("-- BURN NFT --"));
    const nftBurnTx = {
        TransactionType: "NFTokenBurn" as const,
        Account: wallet.address,
        // Destination: "", // Replace with the address of the recipient, only claimable by the recipient
        NFTokenID: nftId
    }

    const preparedBurnTx = await client.autofill(nftBurnTx);
    const resultBurnTx = await client.submitAndWait(preparedBurnTx, {
        wallet: wallet
    });

    if (resultBurnTx.result.validated)
        console.log(`✅🔥 NFT #${nftId} burned. Tx: ${resultBurnTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error burning the nft: ${resultBurnTx}\n`));

    await client.disconnect();
};