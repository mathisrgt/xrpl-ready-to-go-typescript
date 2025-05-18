import chalk from "chalk";
import { AccountSet, AccountSetAsfFlags, AMMCreate, Client, Payment, TrustSet, TrustSetFlags } from "xrpl";

function convertStringToHexPadded(str: string): string {
    // Convert string to hexadecimal
    let hex: string = "";
    for (let i = 0; i < str.length; i++) {
        const hexChar: string = str.charCodeAt(i).toString(16);
        hex += hexChar;
    }

    // Pad with zeros to ensure it's 40 characters long
    const paddedHex: string = hex.padEnd(40, "0");
    return paddedHex.toUpperCase(); // Typically, hex is handled in uppercase
}

export async function amm() {
    console.log(chalk.bgRed('\n-- AMM --'));
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: issuer } = await client.fundWallet();
    console.log(`Issuer: ${chalk.green(issuer.classicAddress)}`);

    const { wallet: receiver } = await client.fundWallet();
    console.log(`Receiver: ${chalk.green(receiver.classicAddress)}\n`);

    const tokenCode = convertStringToHexPadded("TEST");

    // The receiver enable rippling for the issuer
    console.log(chalk.bgWhite("-- ENABLE RIPPLING --"));
    const accountSet: AccountSet = {
        TransactionType: "AccountSet",
        Account: issuer.address,
        SetFlag: AccountSetAsfFlags.asfDefaultRipple,
    };

    const preparedRippletx = await client.autofill(accountSet);
    const resultRippletx = await client.submitAndWait(preparedRippletx, {
        wallet: issuer,
    });

    console.log(`✅🔀 Ripple enabled for ${issuer.address}. Tx: ${resultRippletx.result.hash}`);

    // Create a trust line to send the token
    console.log(chalk.bgWhite("-- CREATE TRUSTLINE --"));
    const trustSet: TrustSet = {
        TransactionType: "TrustSet",
        Account: receiver.address,
        LimitAmount: {
            currency: tokenCode,
            issuer: issuer.address,
            value: "500000000",
        },
        Flags: TrustSetFlags.tfClearNoRipple,
    };

    const preparedTrustSetTx = await client.autofill(trustSet);
    const resultTrustSetTx = await client.submitAndWait(preparedTrustSetTx, {
        wallet: receiver,
    });
    console.log(`✅🔛 Trustline created for ${receiver.address}. Tx: ${resultTrustSetTx.result.hash}`);

    // Send the token
    console.log(chalk.bgWhite("-- SEND PAYMENT --"));
    const sendPayment: Payment = {
        TransactionType: "Payment",
        Account: issuer.address,
        Destination: receiver.address,
        Amount: {
            currency: tokenCode,
            issuer: issuer.address,
            value: "200000000", // 200M tokens
        },
    };

    const preparedPaymentTx = await client.autofill(sendPayment);
    const resultPaymentTx = await client.submitAndWait(preparedPaymentTx, {
        wallet: issuer,
    });

    console.log(`✅➡️ Payment sent from ${issuer.address} to ${receiver.address}. Tx: ${resultPaymentTx.result.hash}`);

    // Create the pool
    console.log(chalk.bgWhite("-- CREATE AMM --"));
    let createAmm: AMMCreate = {
        TransactionType: "AMMCreate",
        Account: receiver.address,
        TradingFee: 600,
        Amount: {
            currency: tokenCode,
            issuer: issuer.classicAddress,
            value: "2000000", // 2M tokens
        },
        Amount2: "50000000", // 50 XRP in drops
    };

    const preparedCreacteAmmTx = await client.autofill(createAmm);
    const resultCreateAmmTx = await client.submitAndWait(preparedCreacteAmmTx, {
        wallet: receiver,
    });
    console.log(`✅🏦 AMM created by the issuer ${issuer.classicAddress}. Tx: ${resultCreateAmmTx.result.hash}`);

    await client.disconnect();
}