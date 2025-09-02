const { JsonRpcProvider, formatEther } = require("ethers");

// 1. Set up provider
const provider = new JsonRpcProvider("https://polygon-rpc.com");

// 2. Address to monitor
const targetAddress =
  "0x9A21Df83569210f0805C45d02cE823682a7fd16C".toLowerCase();

const filter = {
  to: "0x9A21Df83569210f0805C45d02cE823682a7fd16C",
};

provider.on(filter, (log) => {
  console.log("Incoming tx:", log);
});

provider.on("block", async (blockNumber) => {
  console.log(`📦 New block: ${blockNumber}`);

  try {
    // get block data with tx hashes only
    const block = await provider.getBlock(blockNumber);
    const txHashes = block.transactions;

    for (const hash of txHashes) {
      const tx = await provider.getTransaction(hash);
      if (!tx) continue;

      if (tx.to && tx.to.toLowerCase() === targetAddress) {
        console.log("🚀 Incoming transaction found!");
        console.log("From:", tx.from);
        console.log("To:", tx.to);
        console.log("Value:", formatEther(tx.value), "MATIC");
        console.log("Hash:", tx.hash);
      }
    }
  } catch (err) {
    console.error("Error fetching block transactions:", err);
  }
});
