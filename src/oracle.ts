import chalk from "chalk";
import { Client, convertStringToHex, NFTokenCreateOfferFlags, NFTokenMint, NFTokenMintFlags, Wallet } from "xrpl"
import { NFTokenMintMetadata } from "xrpl/dist/npm/models/transactions/NFTokenMint";

export async function oracle() {
    console.log(chalk.bgBlue('\n-- ORACLE --'));
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: wallet } = await client.fundWallet();
    console.log(`Wallet: ${chalk.green(wallet.classicAddress)}\n`);


    // Create or update a price oracle
    console.log(chalk.bgWhite("-- CREATE ORACLE --"));
    const oracleSetTx = {
        TransactionType: "OracleSet" as const,
        Account: wallet.classicAddress,
        OracleDocumentID: 34,  // Unique identifier for this Price Oracle instance
        // Provider: "70726F7669646572", // Hex-encoded provider identifier (e.g., "provider")
        // AssetClass: "63757272656E6379", // Hex-encoded asset class (e.g., "currency")
        LastUpdateTime: Math.floor(Date.now() / 1000), // Current Unix time
        PriceDataSeries: [
            {
                PriceData: {
                    BaseAsset: "XRP",
                    QuoteAsset: "USD",
                    // AssetPrice: 740,  // Example: represents 7.40 with a Scale of 2
                    // Scale: 2
                }
            }
        ]
    };

    const preparedOracleSetTx = await client.autofill(oracleSetTx);
    const resultOracleSetTx = await client.submitAndWait(preparedOracleSetTx, {
        wallet: wallet
    });

    if (resultOracleSetTx.result.validated)
        console.log(`✅ Oracle set. Tx: ${resultOracleSetTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating oracle: ${resultOracleSetTx}\n`));


    // Retreive the price oracle
    console.log(chalk.bgWhite("-- RETRIEVE ORACLE --"));
    const ledgerEntryRequest = {
        command: 'get_aggregate_price' as const,
        base_asset: "XRP",
        quote_asset: "USD",
        trim: 20,
        oracles: [{
            account: wallet.classicAddress,
            oracle_document_id: 34

        }],
    };

    const ledgerEntryResponse = await client.request(ledgerEntryRequest);
    if (ledgerEntryResponse.result.validated) {
        console.log(`✅ Oracle retrieved. Price: ${ledgerEntryResponse.result}`);
    } else {
        console.log(chalk.red(`❌ Error retrieving oracle: ${ledgerEntryResponse.result}`));
    }

    await client.disconnect();
};