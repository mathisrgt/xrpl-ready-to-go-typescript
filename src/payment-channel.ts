import chalk from "chalk";
import { Client, PaymentChannelClaim, PaymentChannelClaimFlags, PaymentChannelCreate, PaymentChannelFund, signPaymentChannelClaim, xrpToDrops } from "xrpl";

export async function channel() {
    console.log(chalk.bgWhite("-- CHANNEL --"));
    const client = new Client("wss://s.devnet.rippletest.net:51233/");

    await client.connect();

    const { wallet: sender } = await client.fundWallet();
    console.log(`Sender: ${sender.classicAddress}`);

    const { wallet: receiver } = await client.fundWallet();
    console.log(`Receiver: ${receiver.classicAddress}`);

    // Create the channel
    
    // Example: 
    // Day 1: I paid for 1 something... (10 XRP)
    let amountToClaimXrp = "10";

    const channelCreateTx: PaymentChannelCreate = {
        TransactionType: "PaymentChannelCreate",
        Account: sender.classicAddress,
        Destination: receiver.classicAddress,
        Amount: xrpToDrops(amountToClaimXrp),
        SettleDelay: 60, // Time to wait before the channel can be closed by the receiver
        PublicKey: sender.publicKey
    }

    const channelCreateTxResult = await client.submitAndWait(channelCreateTx, { autofill: true, wallet: sender });

    if (channelCreateTxResult.result.validated)
        console.log(`✅ ChannelCreate successful! Transaction hash: ${channelCreateTxResult.result.hash}`);
    else
        console.log(`❌ ChannelCreate failed! Error: ${channelCreateTxResult.result.meta}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Retrieve the channel ID in "account_channels"
    const channelInfo = await client.request({
        command: "account_channels",
        account: sender.classicAddress,
        destination_account: receiver.classicAddress
    });

    const channelId = channelInfo.result.channels[0]?.channel_id;

    if (!channelId) {
        console.error("❌ Could not retrieve channel_id");
        return;
    }

    console.log(`🔑 Channel ID: ${channelId}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let signedClaim = signPaymentChannelClaim(channelId, amountToClaimXrp, sender.privateKey);

    const verifyDay1 = await client.request({
        command: "channel_verify",
        channel_id: channelId,
        amount: xrpToDrops(amountToClaimXrp),
        signature: signedClaim,
        public_key: sender.publicKey
    })

    console.log(`🌤️ Day 1 - Signature verified: ${verifyDay1.result.signature_verified ? '✅' : '❌'}`);

    // Day 2: I bought another one
    amountToClaimXrp = "20"; // 10 + 10
    const channelFundingTx: PaymentChannelFund = {
        TransactionType: "PaymentChannelFund",
        Account: sender.classicAddress,
        Channel: channelId,
        Amount: xrpToDrops("10") // Amount to add to the channel
    }

    const channelFundingTxResult = await client.submitAndWait(channelFundingTx, { autofill: true, wallet: sender });

    if (channelFundingTxResult.result.validated)
        console.log(`✅ ChannelFund successful! Transaction hash: ${channelFundingTxResult.result.hash}`);
    else
        console.log(`❌ ChannelFund failed! Error: ${channelFundingTxResult.result.meta}`);

    
    signedClaim = signPaymentChannelClaim(channelId, amountToClaimXrp, sender.privateKey);

    const verifyDay2 = await client.request({
        command: "channel_verify",
        channel_id: channelId,
        amount: xrpToDrops(amountToClaimXrp),
        signature: signedClaim,
        public_key: sender.publicKey
    })

    console.log(`🌤️ Day 2 - Signature verified: ${verifyDay2.result.signature_verified ? '✅' : '❌'}`);

    // Claim the channel amount
    const claimTx: PaymentChannelClaim = {
        TransactionType: "PaymentChannelClaim",
        Account: receiver.classicAddress,
        Channel: channelId,
        Balance: xrpToDrops(amountToClaimXrp),
        Signature: signedClaim,
        PublicKey: sender.publicKey
    };

    const claimResult = await client.submitAndWait(claimTx, { autofill: true, wallet: receiver });

    if (claimResult.result.validated) {
        console.log("✅ Claim settled on-chain: ", claimResult.result.hash);
    } else {
        console.log("❌ Failed to settle claim: ", claimResult.result.meta);
    }

    // Close the channel
    const closePaymentChannelTx: PaymentChannelClaim = {
        TransactionType: "PaymentChannelClaim",
        Account: receiver.classicAddress,
        Channel: channelId,
        Flags: PaymentChannelClaimFlags.tfClose,
    }

    const closePaymentChannelTxResult = await client.submitAndWait(closePaymentChannelTx, { autofill: true, wallet: receiver });

    if (closePaymentChannelTxResult.result.validated)
        console.log(`✅ Channel closed! Transaction hash: ${closePaymentChannelTxResult.result.hash}`);
    else
        console.log(`❌ Channel close failed! Error: ${closePaymentChannelTxResult.result.meta}`);

    await client.disconnect();
}