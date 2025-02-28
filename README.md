# aws-kms-signer

An [ethers.js](https://ethers.org) and [sequence.js](https://github.com/0xsequence/sequence.js)-compatible signer using [AWS Key Management Service](https://aws.amazon.com/kms/) keys.

## Prerequisites

### Set up AWS KMS

1. Create an AWS account if you don't have one
2. Go to AWS KMS in your AWS Console: https://console.aws.amazon.com/kms
3. Switch to your desired region (e.g., us-east-1)
4. Click "Create key"
5. Choose these settings:
   - Key type: `Asymmetric`
   - Key usage: `Sign and verify`
   - Key spec: `ECC_SECG_P256K1` (This is crucial for Ethereum compatibility)
   - Alias: Give your key a name (e.g., `eth-signer`)
6. Configure key administrative permissions and key usage permissions as needed
7. Create the key

### Get AWS Credentials

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam
2. Create a new IAM user or select an existing one
3. Under "Security credentials", create new access keys
4. Save these values - you'll need them for environment variables:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION (the region where you created your key)
   - AWS_KMS_KEY_ID (the ARN of your key, looks like: `arn:aws:kms:region:account:key/key-id`)

## Installation

```bash
npm install @0xsequence/aws-kms-signer
# or
yarn add @0xsequence/aws-kms-signer
# or
pnpm add @0xsequence/aws-kms-signer
```

## Usage

### Basic Setup

```typescript
import { AwsKmsSigner } from 'aws-kms-signer'
import { KMSClient } from '@aws-sdk/client-kms'

const signer = new AwsKmsSigner(
  process.env.AWS_REGION,
  process.env.AWS_KMS_KEY_ID
)
```

### Get Signer's Address

```typescript
const address = await signer.getAddress()
console.log('Signer address:', address)
```

### Sign a Message

```typescript
const message = 'Hello World'
const signature = await signer.signMessage(message)
console.log('Signature:', signature)
```

### Send a Transaction

```typescript
const provider = new ethers.JsonRpcProvider('YOUR_RPC_URL')
const connectedSigner = signer.connect(provider)

const tx = {
  to: '0x...',
  value: 1
}

const response = await connectedSigner.sendTransaction(tx)
const receipt = await response.wait()
console.log('Transaction receipt:', receipt)
```

### Sign Typed Data (EIP-712)

```typescript
const domain = {
  name: 'My Dapp',
  version: '1',
  chainId: 1,
  verifyingContract: '0x...'
}

const types = {
  Person: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' }
  ]
}

const value = {
  name: 'John Doe',
  wallet: '0x...'
}

const signature = await signer.signTypedData(domain, types, value)
```

### Use with Sequence Wallet

```typescript
import { Session } from '@0xsequence/auth'
import { AwsKmsSigner } from 'aws-kms-signer'
import { KMSClient } from '@aws-sdk/client-kms'

const signer = new AwsKmsSigner(
  process.env.AWS_REGION,
  process.env.AWS_KMS_KEY_ID
)

const session = await Session.singleSigner({
  signer,
  projectAccessKey: 'YOUR_PROJECT_ACCESS_KEY'
})

const tx = {
  to: '0x...',
  value: 1
}

const chainId = 421614 //

const response = await session.account.sendTransaction(tx, chainId)
const receipt = await response.wait()
console.log('Transaction receipt:', receipt)
```

## Development

### Environment Setup

Create a `.env` file in the root directory:

```env
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_KMS_KEY_ID=
PROJECT_ACCESS_KEY=
```

### Running Tests

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test
```

## License

MIT
