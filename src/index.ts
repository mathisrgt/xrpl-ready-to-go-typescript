import chalk from 'chalk';
import readline from 'readline';

import { memo } from './memo';
import { payment } from './payment';
import { nft } from './nft';
import { amm } from './amm';
import { oracle } from './oracle';
import { test } from './test';
import { multisig } from './multi-signature';
import { escrow } from './escrow';
import { channel } from './payment-channel';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function printBanner() {
    console.log();
    console.log(chalk.bgWhite.black(' Welcome to the Ready‑to‑Go TypeScript Implementation of the XRP Ledger!'));
    console.log();
}

function printMenu() {
    console.log('\nChoose a feature to run:');
    console.log(`  ${chalk.magenta('1 - NFT')}`);
    console.log(`  ${chalk.red('2 - AMM')}`);
    console.log(`  ${chalk.blue('3 - Oracle')}`);
    console.log(`  ${chalk.yellow('4 - Multisig')}`);
    console.log(`  ${chalk.yellow('5 - Escrow')}`);
    console.log(`  ${chalk.gray('6 - Payment Channel')}`);
    console.log('  0 - Exit');
    console.log();
}

async function handleChoice(choice: string) {
    switch (choice.trim()) {
        case '1':
            await nft();
            break;
        case '2':
            await amm();
            break;
        case '3':
            await oracle();
            break;
        case '4':
            await multisig();
            break;
        case '5':
            await escrow();
            break;
        case '6':
            await channel();
            break;
        case '0':
            console.log('Bye 👋');
            process.exit(0);
        default:
            console.log(chalk.red('Invalid choice, please try again.\n'));
    }
}

async function main() {
    printBanner();

    while (true) {
        printMenu();
        const answer = await new Promise<string>((resolve) => rl.question('Enter the number of your choice: ', resolve));
        await handleChoice(answer);
    }
}

main().catch((err) => {
    console.error(chalk.red('Unexpected error: '), err);
    rl.close();
});
