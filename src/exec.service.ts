import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ethers } from "ethers";
import {
  Client,
  Presets,
  BundlerJsonRpcProvider
} from "./src";
import {
  verifyingPaymaster,
} from "./src/preset/middleware";
import {
  concat,
  pad,
  toHex,
  concatHex,
  hexToBigInt,
  getFunctionSelector
} from "viem";
import {
  type Address,
  type Hex,
} from "@alchemy/aa-core";
import { nftABI } from "./abi.nft";
import { UserOperationMiddlewareCtx } from "./src/context"
import {
  ParamCondition, Operation, Permission,
  getMerkleTree, SessionKeyData, getEncodedData
} from "./src/kernel_util"
import { config } from 'process';
import { Kernel } from './src/preset/builder/kernel';


@Injectable()
export class ExecService {

  private chainId: number;
  private nodeRpcUrl: string;
  private entryPointAddress: string;
  private bundlerUrl: string;
  private serverAddress: string;
  private serverPrivateKey: string;
  private kernelFactoryAddress: string;
  private aaWalletSalt: string;
  private kernelImplAddress: string;
  private ECDSAValidatorAddress: string;

  private clientInstance: Client;
  private serverWallet: ethers.Wallet;
  private kernelInstance: Kernel;

  constructor(private configService: ConfigService) {
    this.chainId = configService.get('CHAIN_ID');
    this.nodeRpcUrl = configService.get('NODE_RPC_URL');
    this.entryPointAddress = configService.get('ENTRY_POINT_ADDRESS');
    this.bundlerUrl = configService.get('BUNDLER_URL');
    this.serverAddress = configService.get('SERVER_ADDRESS');
    this.serverPrivateKey = configService.get('SERVER_PRIVATE_KEY');
    this.kernelFactoryAddress = configService.get('KERNEL_FACTORY_ADDRESS');
    this.aaWalletSalt = configService.get('AA_WALLET_SALT');
    this.kernelImplAddress = configService.get('KERNEL_IMPL_ADDRESS');
    this.ECDSAValidatorAddress = configService.get('ECDSA_VALIDATOR_ADDRESS');

    if (!this.clientInstance) {
      this.initClient();
    }
    if (!this.serverWallet) {
      this.initServerWallet();
    }
  }

  initClient() {
    (async () => {
      this.clientInstance = await Client.init(this.nodeRpcUrl, {
        entryPoint: this.entryPointAddress,
        overrideBundlerRpc: this.bundlerUrl,
      });
    })();
  }

  initServerWallet() {
    const provider = new BundlerJsonRpcProvider(this.nodeRpcUrl).setBundlerRpc(
      this.bundlerUrl,
    );
    this.serverWallet = new ethers.Wallet(this.serverPrivateKey, provider);
  }

  initKernel() {
    (async () => {
      this.kernelInstance = await Presets.Builder.Kernel.init(
        this.serverWallet,
        this.nodeRpcUrl,
        {
          entryPoint: this.entryPointAddress,
          factory: this.kernelFactoryAddress,
          salt: this.aaWalletSalt,
          overrideBundlerRpc: this.bundlerUrl,
          kernelImpl: this.kernelImplAddress,
          ECDSAValidator: this.ECDSAValidatorAddress,
        }
      );
    })();
  }

}
