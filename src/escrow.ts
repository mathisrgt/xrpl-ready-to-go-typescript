import chalk from "chalk";
import crypto from 'crypto';
// @ts-expect-error no types available
import cc from 'five-bells-condition';

import { Client, EscrowCreate, EscrowFinish, isoTimeToRippleTime, xrpToDrops } from "xrpl";

export async function escrow() {
    console.log(chalk.bgRed('\n-- ESCROW --'));
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: wallet1 } = await client.fundWallet();
    console.log(`Wallet 1 : ${chalk.green(wallet1.classicAddress)}\n`);

    const { wallet: wallet2 } = await client.fundWallet();
    console.log(`Wallet 2 : ${chalk.green(wallet2.classicAddress)}\n`);

    // Create a timebased escrow
    console.log(chalk.bgWhite("-- CREATE ESCROW --"));
    const escrowCreateTx: EscrowCreate = {
        TransactionType: "EscrowCreate",
        Account: wallet1.address,
        Amount: xrpToDrops(1),
        Destination: wallet2.address,
        FinishAfter: isoTimeToRippleTime(new Date(Date.now() + 1000)),
    }

    const escrowCreateTxResult = await client.submitAndWait(escrowCreateTx, { autofill: true, wallet: wallet1 });

    if (escrowCreateTxResult.result.validated)
        console.log(`✅ Escrow created. Tx: ${escrowCreateTxResult.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating escrow: ${escrowCreateTxResult}\n`));


    // Finish the escrow
    console.log(chalk.bgWhite("-- FINISH ESCROW --"));
    const escrowFinishTx: EscrowFinish = {
        TransactionType: "EscrowFinish",
        Account: wallet2.address,
        Owner: wallet1.address,
        OfferSequence: (escrowCreateTxResult.result.tx_json).Sequence ?? 0,
    }

    const escrowFinishTxResult = await client.submitAndWait(escrowFinishTx, { autofill: true, wallet: wallet2 });

    if (escrowFinishTxResult.result.validated)
        console.log(`✅ Escrow finished. Tx: ${escrowFinishTxResult.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error finishing escrow: ${escrowFinishTxResult}\n`));

    // Create a condition based escrow
    function generateConditionAndFulfillment() {
        console.log(
            "******* LET'S GENERATE A CRYPTO CONDITION AND FULFILLMENT *******"
        );
        console.log();

        // use cryptographically secure random bytes generation
        const preimage = crypto.randomBytes(32);

        const fulfillment = new cc.PreimageSha256();
        fulfillment.setPreimage(preimage);

        const condition = fulfillment
            .getConditionBinary()
            .toString('hex')
            .toUpperCase();
        console.log('Condition:', condition);

        // Keep secret until you want to finish the escrow
        const fulfillment_hex = fulfillment
            .serializeBinary()
            .toString('hex')
            .toUpperCase();

        console.log(
            'Fulfillment (keep secret until you want to finish the escrow):',
            fulfillment_hex
        );

        return { condition, fulfillment };
    }

    const { condition, fulfillment } = generateConditionAndFulfillment();

    const conditionEscrowCreateTx: EscrowCreate = {
        TransactionType: "EscrowCreate",
        Account: wallet1.address,
        Amount: xrpToDrops(1),
        Destination: wallet2.address,
        Condition: condition,
        CancelAfter: isoTimeToRippleTime(new Date(Date.now() + 1000 * 60 * 60 * 24))
    }
    const conditionEscrowCreateTxResult = await client.submitAndWait(conditionEscrowCreateTx, { autofill: true, wallet: wallet1 });
    if (conditionEscrowCreateTxResult.result.validated)
        console.log(`✅ Condition escrow created. Tx: ${conditionEscrowCreateTxResult.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error creating condition escrow: ${conditionEscrowCreateTxResult}\n`));
    
    // Finish the condition escrow
    console.log(chalk.bgWhite("-- FINISH CONDITION ESCROW --"));
    const conditionEscrowFinishTx: EscrowFinish = {
        TransactionType: "EscrowFinish",
        Account: wallet2.address,
        Owner: wallet1.address,
        OfferSequence: (conditionEscrowCreateTxResult.result.tx_json).Sequence ?? 0,
        // Condition: condition,
        Fulfillment: fulfillment,
    }
    const conditionEscrowFinishTxResult = await client.submitAndWait(conditionEscrowFinishTx, { autofill: true, wallet: wallet2 });
    if (conditionEscrowFinishTxResult.result.validated)
        console.log(`✅ Condition escrow finished. Tx: ${conditionEscrowFinishTxResult.result.hash}\n`);
    else
        console.log(chalk.red(`❌ Error finishing condition escrow: ${conditionEscrowFinishTxResult}\n`));

    await client.disconnect();
};