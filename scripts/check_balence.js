const { ethers, JsonRpcProvider, Wallet, formatEther } = require("ethers");

// 1. Your wallet's private key (DO NOT expose this in frontend or Git)
const privateKey = process.argv.slice(2)[0];
// Connect to Polygon mainnet
const provider = new JsonRpcProvider('https://polygon-rpc.com');

// Create wallet *and* bind it to the provider
const wallet = new Wallet(privateKey, provider);

async function checkBalance() {
    // wallet.address is guaranteed to be defined here
    const balance = await provider.getBalance(wallet.address);
    console.log("Address:", wallet.address);
    console.log("Balance (MATIC):", formatEther(balance));
}


checkBalance().catch(console.error);
