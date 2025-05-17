import chalk from "chalk";
import { memo } from "./memo";
import { payment } from "./payment";

console.log(chalk.bgWhite("Welcome the Ready-to-Go TypeScript Implementation of the XRP Ledger!"));

console.log("Choose a feature to run:");

payment();
memo();