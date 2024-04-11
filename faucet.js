import 'dotenv/config';
import express from 'express';
import { ethers } from 'ethers';
import { NFT_ABI } from './NFT_ABI.js';


// Configure Ethereum provider
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

// Faucet's wallet private key
const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY;
const faucetWallet = new ethers.Wallet(faucetPrivateKey, provider);

// NFT Contract address and ABI
const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
const nftContractABI = NFT_ABI;

const app = express();
app.use(express.json());

// Store the last request timestamp for each address
const requestTimestamps = {};

// Check if 6 hours have passed since the last request
const canRequestAgain = (address) => {
    const lastRequestTime = requestTimestamps[address] || 0;
    return (Date.now() - lastRequestTime) > 21600000; // 6 hours in milliseconds
};

// Faucet route
app.post('/faucet', async (req, res) => {
    const userAddress = req.body.address;

    // Check if address is valid
    if (!ethers.utils.isAddress(userAddress)) {
        return res.status(400).send('Invalid Ethereum address.');
    }

    // Check for 6 hours limit
    if (!canRequestAgain(userAddress)) {
        return res.status(429).send('Request limit reached. Please try again later.');
    }

    try {
        // Check NFT balance
        const nftContract = new ethers.Contract(nftContractAddress, nftContractABI, provider);
        const balance = await nftContract.hasMintedAlready(userAddress);

        // if (!balance) {
        //     return res.status(400).send('No NFT found in the given address.');
        // }

        // Send 0.01 ETH to the user's address
        const tx = await faucetWallet.sendTransaction({
            to: userAddress,
            value: ethers.utils.parseEther('0.01')
        });

        // Update the request timestamp
        requestTimestamps[userAddress] = Date.now();

        res.send(`Transaction successful: ${tx.hash}`);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
