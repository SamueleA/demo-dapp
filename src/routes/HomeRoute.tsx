import React, { useState, useEffect } from 'react'
import { Box, Button } from '~/style'
import { ethers } from 'ethers'
import Web3Modal from "web3modal";

import { sequence } from '0xsequence'

import { ETHAuth, Proof } from '@0xsequence/ethauth'
import { ERC_20_ABI } from '~/utils/abi'
import { sequenceContext } from '@0xsequence/network'

import { configureLogger } from '@0xsequence/utils'
configureLogger({ logLevel: 'DEBUG' })

const HomeRoute = () => {
  const [provider, setProvider] = useState(null);

  const disableActions = !provider;
  const network = 'polygon'

  const connectWeb3Modal = async () => {
    const providerOptions = {
      sequence: {
        package: sequence,
        options: {
          appName: 'demo app123',
          network: 'mainnet',
        }
      }
    };
  
    const web3Modal = new Web3Modal({
      providerOptions,
      cacheProvider: false,
    });
  
    const instance = await web3Modal.connect();
    const wallet = new ethers.providers.Web3Provider(instance);
    setProvider(wallet);
  };

  const getChainID = async () => {
    const signer = provider.getSigner()
    console.log('signer.getChainId()', await signer.getChainId())
  }

  const getAccounts = async () => {
    const signer = provider.getSigner()
    console.log('getAddress():', await signer.getAddress())

    // const provider = wallet.getProvider()
    console.log('accounts:', await provider.listAccounts())
  }

  const getBalance = async () => {
    const signer = provider.getSigner()
    const account = await signer.getAddress()
    const balanceChk1 = await provider.getBalance(account)
    console.log('balance check 1', balanceChk1.toString())

    const balanceChk2 = await signer.getBalance()
    console.log('balance check 2', balanceChk2.toString())
  }

  const getNetworks = async () => {
    console.log('networks:', await provider.getNetwork())
  }

  const signMessage = async () => {
    console.log('signing message...')
    const signer = await provider.getSigner()

    const message = `Two roads diverged in a yellow wood,
Robert Frost poet

And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same,

And both that morning equally lay
In leaves no step had trodden black.
Oh, I kept the first for another day!
Yet knowing how way leads on to way,
I doubted if I should ever come back.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.`

    // sign
    const sig = await signer.signMessage(message)
    console.log('signature:', sig)

    console.log('signed by', ethers.utils.verifyMessage(message, sig));
  }

  const signAuthMessage = async () => {
    console.log('signing message on AuthChain...')
    const signer = await provider.getSigner()
    
    const message = 'Hi there! Please sign this message, 123456789, thanks.'

    // sign
    const sig = await signer.signMessage(message, await signer.getChainId())//, false)
    console.log('signature:', sig)

    console.log('signed by', ethers.utils.verifyMessage(message, sig));
  }

  const signTypedData = async () => {
    console.log('signing typedData...')

    const signer = provider.getSigner();

    const typedData: sequence.utils.TypedData = {
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: await signer.getChainId(),
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
      },
      types: {
        'Person': [
          {name: "name", type: "string"},
          {name: "wallet", type: "address"}
        ]
      },  
      message: {
        'name': 'Bob',
        'wallet': '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
      }
    }    

    const sig = await signer._signTypedData(typedData.domain, typedData.types, typedData.message)
    console.log('signature:', sig)
  }

  const signETHAuth = async () => {
    // wallet.logout()

    // debugger
    const authSigner = await provider.getSigner()

    const address = await authSigner.getAddress()

    console.log('AUTH CHAINID..', await authSigner.getChainId())
    const authChainId = await authSigner.getChainId()

    const proof = new Proof()
    proof.address = address
    proof.claims.app = 'wee'
    proof.claims.ogn = 'http://localhost:4000'
    proof.setIssuedAtNow()
    proof.setExpiryIn(1000000)

    // TODO: chainId on this proof..?

    const messageTypedData = proof.messageTypedData()

    // wallet.commands.signAuthorization() , etc.. also easier..

    console.log('!messageTypedData BEFORE', messageTypedData)
    const digest = sequence.utils.encodeTypedDataDigest(messageTypedData)
    console.log('we expect digest:', digest)


    const sig = await authSigner._signTypedData(messageTypedData.domain, messageTypedData.types, messageTypedData.message)
    console.log('signature:', sig)

    // TODO: we could add isValidETHAuthSignature()
    // might make it easy so we dont think about the chainId ..?
    // on the .commands. .. could work.. helpful, ya

    console.log('!messageTypedData NOW.......', messageTypedData)
    const digest2 = sequence.utils.encodeTypedDataDigest(messageTypedData)
    console.log('DIGEST NOW........:', digest2)

    console.log('signed by', ethers.utils.verifyMessage(digest, sig));
  }

  const sendETH = async (signer?: sequence.provider.Web3Signer) => {
    signer = signer || provider.getSigner() // select DefaultChain signer by default

    console.log(`Transfer txn on ${signer.getChainId()} chainId......`)

    // NOTE: on mainnet, the balance will be of ETH value
    // and on matic, the balance will be of MATIC value
    // const balance = await signer.getBalance()
    // if (balance.eq(ethers.constants.Zero)) {
    //   const address = await signer.getAddress()
    //   throw new Error(`wallet ${address} has 0 balance, so cannot transfer anything. Deposit and try again.`)
    // }

    const toAddress = ethers.Wallet.createRandom().address

    const tx1 = {
      gasLimit: '0x55555',
      to: toAddress,
      value: ethers.utils.parseEther('1.234'),
      data: '0x'
    }

    console.log(`balance of ${toAddress}, before:`, await provider.getBalance(toAddress))

    const txnResp = await signer.sendTransaction(tx1)
    await txnResp.wait()

    console.log(`balance of ${toAddress}, after:`, await provider.getBalance(toAddress))
  }

  const sendDAI = async(signer?: sequence.provider.Web3Signer) => {
    signer = signer || provider.getSigner() // select DefaultChain signer by default

    const toAddress = ethers.Wallet.createRandom().address

    const amount = ethers.utils.parseUnits('5', 18)
    
    const daiContractAddress = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' // (DAI address on Polygon)

    const tx = {
      gasLimit: '0x55555',
      to: daiContractAddress,
      value: 0,
      data: new ethers.utils.Interface(ERC_20_ABI).encodeFunctionData('transfer', [toAddress, amount.toHexString()])
    }

    const txnResp = await signer.sendTransaction(tx)
    await txnResp.wait()
  }

  const send1155Tokens = async () => {
    console.log('TODO')
  }

  return (
    <Box sx={{
      width: '80%',
      textAlign: 'center',
      mx: 'auto',
      color: 'black',
      my: '50px'
    }}>
      <h1 style={{ color: 'white', marginBottom: '10px' }}>Demo Dapp ({network && network.length > 0 ? network : 'mainnet' })</h1>

      <p style={{ color: 'white', marginBottom: '14px', fontSize: '14px', fontStyle: 'italic' }}>Please open your browser dev inspector to view output of functions below</p>

      <p>
        <Button px={3} m={1} onClick={() => connectWeb3Modal()}>Connect Web3Modal</Button>
      </p>
      <br /> 
      <p>
        <Button disabled={disableActions} px={3} m={1} onClick={() => getChainID()}>ChainID</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => getNetworks()}>Networks</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => getAccounts()}>Get Accounts</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => getBalance()}>Get Balance</Button>
      </p>
      <br />
      <p>
        <Button disabled={disableActions} px={3} m={1} onClick={() => signMessage()}>Sign Message</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => signTypedData()}>Sign TypedData</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => signAuthMessage()}>Sign Message on AuthChain</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => signETHAuth()}>Sign ETHAuth</Button>
      </p>
      <br />
      <p>
        <Button disabled={disableActions} px={3} m={1} onClick={() => sendETH()}>Send on DefaultChain</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => sendDAI()}>Send DAI</Button>
        <Button disabled={disableActions} px={3} m={1} onClick={() => send1155Tokens()}>Send ERC-1155 Tokens</Button>
      </p>

    </Box>
  )
}

const erc1155Abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export default React.memo(HomeRoute)
