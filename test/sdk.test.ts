import { config } from 'dotenv'
import { ethers, TransactionResponse } from 'ethers'
import { expect, it } from 'vitest'

import { AwsKmsSigner } from '../src/index'
import { Session } from '@0xsequence/auth'

// Load environment variables
config()

// Verify required env vars are present
if (!process.env.AWS_REGION || !process.env.AWS_KMS_KEY_ID) {
  throw new Error('Required environment variables AWS_REGION and AWS_KMS_KEY_ID must be set')
}

const signer = new AwsKmsSigner(
  process.env.AWS_REGION,
  process.env.AWS_KMS_KEY_ID,
)

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')

it('should sign a message', async () => {
  const message = 'hello world'
  const signature = await signer.signMessage(message)
  const address = ethers.verifyMessage(message, signature)

  expect(address).to.equal(await signer.getAddress())
}, 100000)

it('should send a transaction using a sequence wallet', async () => {
    signer.connect(provider)
    
    const session = await Session.singleSigner({ signer, projectAccessKey: process.env.PROJECT_ACCESS_KEY! })
    
    const tx = {
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        value: 1,
    }

    const sessionSigner = session.account.getSigner(84532);
    const smartAccountAddress = session.account.address

    let balance = await provider.getBalance(smartAccountAddress)
    if (balance < BigInt(1000000000)) {
        const faucet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80').connect(provider)
        await (await faucet.sendTransaction({ to: smartAccountAddress, value: '1000000000000000000' })).wait()
        balance = await provider.getBalance(smartAccountAddress)
    }

    const response: TransactionResponse | undefined = await sessionSigner.sendTransaction(tx);
    const receipt = await response?.wait();

    console.log(receipt, "RECEIPT");

    expect(receipt?.status).to.equal(1)
}, 100000)

it('should send a transaction with kms signer', async () => {
    let balance = await provider.getBalance(signer.getAddress())
    if (balance < BigInt(1000000000)) {
        const faucet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80').connect(provider)
        await (await faucet.sendTransaction({ to: await signer.getAddress(), value: '1000000000000000000' })).wait()
        balance = await provider.getBalance(signer.getAddress())
    }

    const connectedSigner = signer.connect(provider)

    const tx = {
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        value: 1,
        chainId: (await provider.getNetwork()).chainId,
    }

    const txResponse = await connectedSigner.sendTransaction(tx)
    const receipt = await txResponse.wait()

    expect(receipt?.status).to.equal(1)
    expect(receipt?.from).to.equal(await connectedSigner.getAddress())
    expect((await provider.getBalance(await signer.getAddress())) < balance).to.be.true
}, 100000)

it('should sign typed data', async () => {
  const domain = {
    name: 'Test Domain',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
  }

  const types = {
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' }
    ]
  }

  const value = {
    name: 'John Doe',
    wallet: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
  }

  const signature = await signer.signTypedData(domain, types, value)
  const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature)
  const signerAddress = await signer.getAddress()

  expect(recoveredAddress.toLowerCase()).to.equal(signerAddress.toLowerCase())
}, 100000)

it('should throw on invalid from address', async () => {
    const connectedSigner = signer.connect(provider)

    const tx = {
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        value: 1,
        from: '0x1234567890123456789012345678901234567890', // Wrong address
    }

    await expect(connectedSigner.signTransaction(tx)).rejects.toThrow(/from address/)
})

// it('should sign for a sequence wallet', async () => {
//     const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
//     const { chainId } = await provider.getNetwork()

//     const session = await Session.singleSigner({ signer, projectAccessKey: process.env.PROJECT_ACCESS_KEY! })

//     const message = ethers.toUtf8Bytes('hello world')
//     // const signature = await signer.signMessage(message)
//     const signature = await session.account.signMessage(message, chainId, 'eip6492')

//     const isValid = await isValidMessageSignature(session.account.address, message, signature, provider)
//     console.log("IS VALID", isValid)
//     expect(isValid).to.be.true
// }, 100000)