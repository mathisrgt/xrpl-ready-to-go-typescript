import chalk from "chalk";
import { AccountSetAsfFlags, AccountSetTfFlags, Client, convertStringToHex, multisign, NFTokenCreateOfferFlags, NFTokenMint, NFTokenMintFlags, Payment, Wallet, xrpToDrops } from "xrpl"
import { Ticket } from "xrpl/dist/npm/models/ledger";
import { NFTokenMintMetadata } from "xrpl/dist/npm/models/transactions/NFTokenMint";

export async function multisig() {
    console.log(chalk.bgYellow('\n-- MULTISIG --'));
    const client = new Client("wss://s.altnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: multisig } = await client.fundWallet();
    const { wallet: wallet1 } = await client.fundWallet();
    const { wallet: wallet2 } = await client.fundWallet();

    console.log(`Multisig wallet: ${chalk.green(multisig.classicAddress)}\n`);
    console.log(`Wallet 1 : ${chalk.green(wallet1.classicAddress)}\n`);
    console.log(`Wallet 2 : ${chalk.green(wallet2.classicAddress)}\n`);

    // Setup SignerListSet
    console.log(chalk.bgWhite("-- SETUP SIGNERLISTSET --"));

    const signerListSetTx = {
        TransactionType: "SignerListSet" as const,
        Account: multisig.classicAddress,
        SignerQuorum: 2,
        SignerEntries: [
            { SignerEntry: { Account: wallet1.classicAddress, SignerWeight: 1 } },
            { SignerEntry: { Account: wallet2.classicAddress, SignerWeight: 1 } }
        ],
    };

    const preparedSignerListSetTx = await client.autofill(signerListSetTx);
    const resultSignerListSetTx = await client.submitAndWait(preparedSignerListSetTx, {
        wallet: multisig
    });

    if (resultSignerListSetTx.result.validated)
        console.log(`✅ SignerListSet created. Tx: ${resultSignerListSetTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating SignerListSet: ${resultSignerListSetTx}\n`));

    // Create tickets
    console.log(chalk.bgWhite("-- CREATE TICKETS --"));
    const ticketCount = 5;

    const createTicketTx = {
        TransactionType: "TicketCreate" as const,
        Account: multisig.classicAddress,
        TicketCount: ticketCount
    }

    const resultCreateTicketTx = await client.submitAndWait(createTicketTx, {
        autofill: true,
        wallet: multisig
    });

    if (resultCreateTicketTx.result.validated)
        console.log(`✅ Tickets created. Tx: ${resultCreateTicketTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating tickets: ${resultCreateTicketTx}\n`));

    // Retrieve tickets
    console.log(chalk.bgWhite("-- RETRIEVE TICKETS --"));

    const accountTickets = await client.request({
        command: 'account_objects' as const,
        account: multisig.classicAddress,
        type: 'ticket' as const,
    });

    console.log(`Active tickets: ${JSON.stringify(accountTickets.result.account_objects, null, 2)}\n`);

    // Optional - Disable master key
    // console.log(chalk.bgWhite("-- DISABLE MASTER KEY --"));
    // const accountSetTx = {
    //     TransactionType: "AccountSet" as const,
    //     Account: multisig.classicAddress,
    //     SetFlag: AccountSetAsfFlags.asfDisableMaster, // Disable master key
    // }
    // const resultAccountSetTx = await client.submitAndWait(accountSetTx, {
    //     autofill: true,
    //     wallet: multisig
    // });
    // if (resultAccountSetTx.result.validated)
    //     console.log(`✅🔒 Master key disabled. Tx: ${resultAccountSetTx.result.hash}\n`);
    // else
    //     console.log(chalk.red(`❌ Error disabling master key: ${resultAccountSetTx}\n`));

    // Send a transaction  
    // console.log(chalk.bgWhite("-- SEND MULTISIG TRANSACTION --"));

    // const ledgerResponse = await client.request({
    //     command: "ledger",
    //     ledger_index: "current"
    // });
    // const currentLedgerIndex = ledgerResponse.result.ledger_index;
    // const lastLedgerSequence = currentLedgerIndex + 10;

    // const multisigPaymentTx: Payment = {
    //     TransactionType: "Payment",
    //     Account: multisig.classicAddress,
    //     Destination: wallet1.classicAddress,
    //     Amount: xrpToDrops(1),
    //     TicketSequence: (accountTickets.result.account_objects[0] as Ticket).TicketSequence,
    //     Sequence: 0,
    //     Fee: "12",
    //     LastLedgerSequence: lastLedgerSequence
    // };

    // const signedTx1 = wallet1.sign(multisigPaymentTx, true);
    // const signedTx2 = wallet2.sign(multisigPaymentTx, true);

    // const multisigedTx = multisign([signedTx1.tx_blob, signedTx2.tx_blob]);
    // const resultMultisigTx = await client.submitAndWait(multisigedTx);

    // if (resultMultisigTx.result.validated)
    //     console.log(`✅ Multisig transaction sent. Tx: ${resultMultisigTx.result.hash}\n`);
    // else
    //     console.log(chalk.red(`❌ Error sending multisig transaction: ${resultMultisigTx}\n`));

    console.log(chalk.bgWhite("-- SEND MULTISIG TRANSACTION --"));

    const multisigPaymentTx: Payment = await client.autofill({
        TransactionType: "Payment",
        Account: multisig.classicAddress,
        Destination: wallet1.classicAddress,
        Amount: xrpToDrops(1)
    }, 2);

    const signedTx1 = wallet1.sign(multisigPaymentTx, true);
    const signedTx2 = wallet2.sign(multisigPaymentTx, true);

    const multisigedTx = multisign([signedTx1.tx_blob, signedTx2.tx_blob]);
    const resultMultisigTx = await client.submitAndWait(multisigedTx);

    if (resultMultisigTx.result.validated)
        console.log(`✅ Multisig transaction sent. Tx: ${resultMultisigTx.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error sending multisig transaction: ${resultMultisigTx}\n`));

    await client.disconnect();
};
