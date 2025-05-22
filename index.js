import dotenv from "dotenv";
import { ethers } from "ethers";
import readline from "readline";
import cfonts from "cfonts";
import chalk from "chalk";

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function transferNEX(to, amount = "0.1") {
    try {
        console.log("\n==============================");
        console.log("      🚀 NEX Transfer 🚀      ");
        console.log("==============================\n");

        // Load provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        console.log("🔹 Кошелек был загружен.");

        // Convert amount to the correct decimal (assuming 18 decimals for NEX)
        const value = ethers.parseUnits(amount, 18);
        console.log(`🔹 Готовимся к отправке: ${amount} NEX к ${to}`);

        // Dynamically estimate gas limit
        const estimatedGasLimit = await provider.estimateGas({
            to: to,
            value: value
        });
        console.log(`🔹 Примерный Gas Limit: ${estimatedGasLimit.toString()}`);

        // Fetch up-to-date fee data
        const feeData = await provider.getFeeData();
        let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits("2", "gwei");
        let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("1", "gwei");

        // Ensure maxPriorityFeePerGas does not exceed maxFeePerGas and increase it slightly
        if (BigInt(maxPriorityFeePerGas) > BigInt(maxFeePerGas)) {
            maxPriorityFeePerGas = maxFeePerGas / BigInt(2);
        }
        if (BigInt(maxPriorityFeePerGas) < 0) {
            maxPriorityFeePerGas = ethers.parseUnits("0.5", "gwei");
        }

        // Slightly increase gas fees to prevent underpayment issues
        maxFeePerGas = BigInt(maxFeePerGas) + ethers.parseUnits("0.5", "gwei");
        maxPriorityFeePerGas = BigInt(maxPriorityFeePerGas) + ethers.parseUnits("0.2", "gwei");

        console.log(`🔹 Gas Fees: maxFeePerGas=${maxFeePerGas.toString()}, maxPriorityFeePerGas=${maxPriorityFeePerGas.toString()}`);

        // Create native transfer transaction
        const tx = {
            to: to, // Recipient address
            value: value, // Amount of NEX to send
            gasLimit: estimatedGasLimit, // Dynamic gas limit
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            chainId: parseInt(process.env.CHAIN_ID),
            type: 2, // EIP-1559 transaction
        };

        console.log("🔹 Подписываем и отправляем транзакцию...");
        // Sign and send transaction
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`✅ Транзакция была отправлена! Hash: ${txResponse.hash}\n`);

        // Wait for confirmation
        console.log("⏳ Ожидаем подтверждение транзакции...");
        const receipt = await txResponse.wait();
        console.log("✅ Транзакция подтверждена!");
        console.log(`🔹 Block Number: ${receipt.blockNumber}`);
        console.log(`🔹 Gas Used: ${receipt.gasUsed.toString()} units`);
        console.log("\n==============================");
        console.log("      ✅ Транзакция завершена ✅  ");
        console.log("==============================\n");
    } catch (error) {
        console.error("❌ Ошибка при отправке:", error.message);
    }
}

function askForInput() {
    rl.question("Введите адрес кошелька (если больше 1, то разделяйте символом ,): ", (addresses) => {
        const recipients = addresses.split(",").map(addr => addr.trim());
        rl.question("Сколько отправить NEX: ", (amount) => {
            rl.question("Сколько раз повторить отправку: ", async (loopCount) => {
                loopCount = parseInt(loopCount);
                console.log(`\nНачинаем отправку к ${recipients.length} addresses, повторяем ${loopCount} раз...`);
                for (let j = 0; j < loopCount; j++) {
                    console.log(`\n🔄 Loop ${j + 1}/${loopCount}`);
                    for (let i = 0; i < recipients.length; i++) {
                        console.log(`\n➡️ Отправяем ${amount} NEX к ${recipients[i]} (Транзакция ${i + 1}/${recipients.length})`);
                        await transferNEX(recipients[i], amount);
                    }
                }
                console.log("✅ Все транзакции были выполнены!");
                rl.close();
            });
        });
    });
}

askForInput();
