const express = require("express");
const { ethers } = require("ethers");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Your master mnemonic (NEVER share this publicly!)
const mnemonic = process.env.PHRASE
const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);

// Polygon RPC
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");

// In-memory session store
const sessions = {};

// Derive a new address for each session using HD path m/44'/60'/0'/0/index
// (Ethereum/Polygon standard derivation path)
app.post("/start-payment", async (req, res) => {
    const sessionId = uuidv4();
    // Derive new wallet for session
    const index = Object.keys(sessions).length; // simple increment; better to store persistently in prod
    const childWallet = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);

    sessions[sessionId] = {
        address: childWallet.address,
        amount: ethers.parseEther("0.00001").toString(),
        paid: false,
        index,
    };

    res.json({ sessionId, address: childWallet.address, amountMatic: "0.00001" });
});

app.get("/check-payment/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    const balance = await provider.getBalance(session.address);
    if (balance >= BigInt(session.amount)) {
        session.paid = true;
        return res.json({ paid: true });
    }

    res.json({ paid: false });
});

app.get("/premium-content/:sessionId", (req, res) => {
    const session = sessions[req.params.sessionId];
    if (!session || !session.paid) {
        return res.status(402).json({ error: "Payment required" });
    }

    res.json({ content: "🎉 Welcome to the premium zone!" });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
