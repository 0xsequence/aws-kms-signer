import { config } from 'dotenv'
import { ethers, TransactionResponse } from 'ethers'
import { expect, it } from 'vitest'

import { AwsKmsSigner } from '../src/index'
import { Session } from '@0xsequence/auth'
import { isValidMessageSignature, isValidTypedDataSignature } from '@0xsequence/provider'

// Load environment variables
config()

// Verify required env vars are present
if (!process.env.AWS_REGION || !process.env.AWS_KMS_KEY_ID) {
  throw new Error('Required environment variables AWS_REGION and AWS_KMS_KEY_ID must be set')
}

const awsKmsEthersSigner = new AwsKmsSigner(
  process.env.AWS_REGION,
  process.env.AWS_KMS_KEY_ID,
)

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')

it('should sign a message with kms EOA', async () => {
  const message = 'hello world'
  const signature = await awsKmsEthersSigner.signMessage(message)
  const address = ethers.verifyMessage(message, signature)

  expect(address).to.equal(await awsKmsEthersSigner.getAddress())
}, 100000)

it('should send a transaction using the sequence smart account on arbitrum sepolia', async () => {
    const session = await Session.singleSigner({ signer: awsKmsEthersSigner, projectAccessKey: process.env.PROJECT_ACCESS_KEY! })

    const tx = {
      to: '0x42420815C55d7A8F9a79227be7070dac9a2Bb113',
      value: 1,
    }

    const arbitrumSepoliaChainId = 421614;

    const response: TransactionResponse | undefined = await session.account.sendTransaction(tx, arbitrumSepoliaChainId);
    const receipt = await response?.wait();

    expect(receipt?.status).to.equal(1)
}, 100000)

it('should send a transaction with kms EOA', async () => {
    let balance = await provider.getBalance(awsKmsEthersSigner.getAddress())
    if (balance < BigInt(1000000000)) {
        const faucet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80').connect(provider)
        await (await faucet.sendTransaction({ to: await awsKmsEthersSigner.getAddress(), value: '1000000000000000000' })).wait()
        balance = await provider.getBalance(awsKmsEthersSigner.getAddress())
    }

    const connectedSigner = awsKmsEthersSigner.connect(provider)

    const tx = {
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        value: 1,
        chainId: (await provider.getNetwork()).chainId,
    }

    const txResponse = await connectedSigner.sendTransaction(tx)
    const receipt = await txResponse.wait()

    expect(receipt?.status).to.equal(1)
    expect(receipt?.from).to.equal(await connectedSigner.getAddress())
    expect((await provider.getBalance(await awsKmsEthersSigner.getAddress())) < balance).to.be.true
}, 100000)

it('should sign typed data with sequence smart account', async () => {
    const provider = new ethers.JsonRpcProvider('https://arbitrum-sepolia.drpc.org')
    const { chainId } = await provider.getNetwork()

    // Create a single signer sequence wallet session
    const session = await Session.singleSigner({
      signer: awsKmsEthersSigner,
      projectAccessKey: 'AQAAAAAAAHqkq694NhWZQdSNJyA6ubOK494'
    })

    const sessionSigner = session.account.getSigner(Number(chainId));

    const typedData = {
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: await sessionSigner.getChainId(),
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      },
      types: {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
      },
      message: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
    };

    const signature = await sessionSigner.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    )

    const isValid = await isValidTypedDataSignature(
      await sessionSigner.getAddress(),
      typedData,
      signature,
      provider
    )

    expect(isValid).to.be.true
}, 100000)

it('should throw on invalid from address', async () => {
    const connectedSigner = awsKmsEthersSigner.connect(provider)

    const tx = {
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        value: 1,
        from: '0x1234567890123456789012345678901234567890', // Wrong address
    }

    await expect(connectedSigner.signTransaction(tx)).rejects.toThrow(/from address/)
})

it('should sign a message with sequence smart account', async () => {
  const provider = new ethers.JsonRpcProvider('https://arbitrum-sepolia.drpc.org')
  const { chainId } = await provider.getNetwork()

  const session = await Session.singleSigner({
    signer: awsKmsEthersSigner,
    projectAccessKey: process.env.PROJECT_ACCESS_KEY!
  })

  const message = 'Hello world'
  const messageBytes = ethers.toUtf8Bytes(message)
  const eip191prefix = ethers.toUtf8Bytes('\x19Ethereum Signed Message:\n')

  const prefixedMessage = ethers.getBytes(
    ethers.concat([eip191prefix, ethers.toUtf8Bytes(String(messageBytes.length)), messageBytes])
  )

  const signature = await session.account.signMessage(prefixedMessage, chainId, 'eip6492')
  console.log('Signature', signature)
  const isValid = await isValidMessageSignature(session.account.address, message, signature, provider)

  expect(isValid).to.be.true
}, 100000)
