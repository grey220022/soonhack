import { encode } from 'bs58';
import {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  ComputeBudgetProgram,
  Connection,
} from '@solana/web3.js';
import { PUBLIC_KEY_RECEIVER, SOLANA_ENDPOINT_URL } from './solana.const';
import { generateURLWithSession } from './session';
import { WalletID } from '@/components/ConnectWalletModal/WalletList';
import { getDefaultStore } from 'jotai/vanilla';
import { connectedWalletaddressAtom } from '@/store';

// import * as web3 from "@solana/web3.js";
// import * as splToken from "@solana/spl-token";

const NETWORK_FEE = 0.00005;
const RENT_EXEMPT_AMOUNT = 0.00100224;

declare let window: Window &
  typeof globalThis & {
    solana?: any;
    okxwallet?: any;
    bitkeep?: any;
    backpack?: any;
  };

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const isPhantom = 'phantom' in window && !('bitkeep' in window);
export const isBitGet = 'bitkeep' in window;

export const isPhantomApp = isMobile && /Phantom/i.test(navigator.userAgent);
export const isBitGetApp = isMobile && /BitKeep/i.test(navigator.userAgent);
export const isOkxApp = isMobile && /OKEx/i.test(navigator.userAgent);

export const getMobileProviderName = (): WalletID | null => {
  if (isPhantomApp) return 'phantom';
  if (isBitGetApp) return 'bitget';
  if (isOkxApp) return 'okx';
  return null;
};

const getPhantomProvider = (callbackUrl?: string) => {
  if ('phantom' in window) {
    const provider = (window.phantom as { solana?: any })?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }

  if (isMobile) {
    const url = encodeURIComponent(generateURLWithSession(callbackUrl));
    const ref = encodeURIComponent(window.location.origin);
    const deeplinkUrl = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    window.location.href = deeplinkUrl;
    return;
  }
  window.open('https://phantom.app/', '_blank');
};

const getOkxProvider = (callbackUrl?: string) => {
  if ('okxwallet' in window) {
    const provider = window.okxwallet.solana;

    if (provider) {
      return provider;
    }
  }
  if (isMobile) {
    const encodedUrl =
      'https://www.okx.com/download?deeplink=' +
      encodeURIComponent(
        'okx://wallet/dapp/url?dappUrl=' +
          encodeURIComponent(generateURLWithSession(callbackUrl)),
      );
    window.location.href = encodedUrl;
    return;
  }
  window.open('https://www.okx.com/web3', '_blank');
};

const getBitgetProvider = (callbackUrl?: string) => {
  if ('bitkeep' in window) {
    const provider = window.bitkeep.solana;
    if (provider) {
      return provider;
    }
  }
  if (isMobile) {
    // https://docs.bitkeep.com/en/docs/guide/mobile/Deeplink.html for deep link documentation
    const encodedUrl =
      'https://bkcode.vip?action=dapp&url=' +
      encodeURIComponent(generateURLWithSession(callbackUrl));
    window.location.href = encodedUrl;
    return;
  }
  window.open('https://web3.bitget.com/en/wallet-download', '_blank');
};

const getBackpackProvider = (callbackUrl?: string) => {
  console.log('backpackwallet');
  if ('backpack' in window) {
    const provider = window.backpack;
    if (provider) {
      return provider;
    }
  }
};

export const getProvider = (wallet: WalletID, callbackUrl?: string) => {
  console.log('connecting wallet', wallet);
  switch (wallet) {
    case 'phantom':
      return getPhantomProvider(callbackUrl);
    case 'okx':
      return getOkxProvider(callbackUrl);
    case 'bitget':
      return getBitgetProvider(callbackUrl);
    case 'backpack':
      return getBackpackProvider(callbackUrl);
  }
};

export const signMessage = async (provider: any, message: string) => {
  /*
  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = (await provider.signMessage(
    encodedMessage,
    'utf8',
  )) as {
    signature: Uint8Array;
    publicKey: Uint8Array;
  };*/

  return {
    publicKey: '',
    signature: '',
  };
};

export const sendSolFromAddress = async (
  providerName: WalletID,
  sol: number,
  destinationAddress?: string,
) => {
  try {
    const provider = getProvider(providerName);
    await provider.connect();
    const connection = new Connection(SOLANA_ENDPOINT_URL, 'confirmed');
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 500,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 20000000,
    });

    const transaction = new Transaction()
      //.add(addPriorityFee)
      //.add(modifyComputeUnits)
      .add(
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: new PublicKey(destinationAddress ?? PUBLIC_KEY_RECEIVER),
          lamports: Math.round(sol * LAMPORTS_PER_SOL),
        }),
      );

    transaction.feePayer = provider.publicKey;
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    const signedTransaction = (await provider.signTransaction(
      transaction,
    )) as any;

    const serializedTransaction = signedTransaction.serialize();
    const txId = await connection.sendRawTransaction(serializedTransaction);

    const response = await connection.confirmTransaction({
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
      signature: txId,
    });
    if (response.value.err) {
      throw new Error(
        'Transaction failed: ' + JSON.stringify(response.value.err),
      );
    }
    return txId;
  } catch (err) {
    console.error(err);
    return '';
  }
};

export function generateSecureRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (num) => characters[num % characters.length]).join(
    '',
  );
}

export const getSolanaSpendableBalance = async (walletAddress: string) => {
  let address: string | null = null;
  const store = getDefaultStore();
  const connectedWalletAddress = store.get(connectedWalletaddressAtom);
  try {
    const connection = new Connection(SOLANA_ENDPOINT_URL, 'confirmed');
    address =
      walletAddress && !walletAddress.startsWith('solana_')
        ? walletAddress
        : connectedWalletAddress;
    const publicKey = new PublicKey(address || '');
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL - RENT_EXEMPT_AMOUNT - NETWORK_FEE;
  } catch (error) {
    throw new Error(
      'Unable to fetch balance for the provided wallet address: ' + address,
    );
  }
};
