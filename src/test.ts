import { Client } from "xrpl";

export async function test() {
    console.log('-- TEST --');
    const client = new Client("ws://localhost:6005");

    await client.connect();
    const { wallet: wallet } = await client.fundWallet();
    console.log(`Wallet: ${wallet.classicAddress}`);

    await client.disconnect();
}