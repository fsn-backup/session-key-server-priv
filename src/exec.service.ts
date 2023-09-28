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
import {
  EntryPoint,
  EntryPoint__factory,
  KernelFactory__factory,
  Kernel__factory,
} from './src/typechain';

import {
  IPresetBuilderOpts,
  ICall,
  UserOperationMiddlewareFn,
  IUserOperationBuilder,
  IUserOperation
} from "./src/types";


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
  private nftAddress: string;
  private paymasterUrl: string;
  private paymasterAddress: string;
  private sessionKeyExecutorAddress: string;

  private clientInstance: Client;
  private provider: ethers.providers.JsonRpcProvider;
  private serverWallet: ethers.Wallet;
  private kernelInstance: Kernel;
  private entryPointInstance: ethers.Contract;
  private kernelFactoryInstance: ethers.Contract;
  private kernelImplInstance: ethers.Contract;
  private KernelProxyInstance: ethers.Contract;

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
    this.nftAddress = configService.get('NFT_ADDRESS');
    this.paymasterUrl = configService.get('PAYMASTER_URL');
    this.paymasterAddress = configService.get('PAYMASTER_ADDRESS');
    this.sessionKeyExecutorAddress = configService.get(
      'SESSION_KEY_EXECUTOR_ADDRESS',
    );
  }

  async onModuleInit() {
    if (!this.clientInstance) {
      await this.initClient();
    }
    if (!this.serverWallet) {
      this.initServerWallet();
    }
    if (!this.kernelInstance) {
      await this.initKernel();
    }
    if (!this.entryPointInstance) {
      await this.initEntryPoint();
    }
    if (!this.kernelFactoryInstance) {
      await this.initKernelFactory();
    }
    if (!this.kernelImplInstance) {
      await this.initKernelImpl();
    }
    if (!this.KernelProxyInstance) {
      await this.initKernelProxy();
    }
  }

  async initClient() {
    this.clientInstance = await Client.init(this.nodeRpcUrl, {
      entryPoint: this.entryPointAddress,
      overrideBundlerRpc: this.bundlerUrl,
    });
  }

  initServerWallet() {
    const provider = new BundlerJsonRpcProvider(this.nodeRpcUrl).setBundlerRpc(
      this.bundlerUrl,
    );
    this.provider = provider;
    this.serverWallet = new ethers.Wallet(this.serverPrivateKey, provider);
  }

  async initKernel() {
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
  }

  async initEntryPoint() {
    this.entryPointInstance = EntryPoint__factory.connect(
      this.entryPointAddress,
      this.provider,
    );
  }

  async initKernelFactory() {
    this.kernelFactoryInstance = KernelFactory__factory.connect(
      this.kernelFactoryAddress,
      this.provider,
    );
  }

  async initKernelImpl() {
    this.kernelImplInstance = Kernel__factory.connect(
      this.kernelImplAddress,
      this.provider,
    );
  }

  async initKernelProxy() {
    this.KernelProxyInstance = Kernel__factory.connect(
      ethers.constants.AddressZero,
      this.provider,
    );
  }

  async getAAAddress(userAddress: string, salt: number): Promise<string> {
    try {
      const initCode = ethers.utils.hexConcat([
        this.kernelFactoryAddress,
        this.kernelFactoryInstance.interface.encodeFunctionData(
          'createAccount',
          [
            this.kernelImplAddress,
            this.KernelProxyInstance.interface.encodeFunctionData(
              'initialize',
              [this.ECDSAValidatorAddress, userAddress],
            ),
            ethers.BigNumber.from(salt),
          ]),
      ]);
      await this.entryPointInstance.callStatic.getSenderAddress(initCode);
    } catch (error: any) {
      const aaAddress = error?.errorArgs?.sender;
      return aaAddress;
    }
    return '0x';
  }

  buildMintNFTCall(aaAddress: string): ICall {
    const NFTContract = new ethers.Contract(
      this.nftAddress,
      nftABI,
      this.provider,
    );
    const call = {
      to: this.nftAddress,
      value: 0,
      data: NFTContract.interface.encodeFunctionData('safeMint', [aaAddress]),
    }
    return call;
  }

  getBuilder(call: ICall, aaAddress: string): IUserOperationBuilder {
    const builder = this.kernelInstance.execute(call).setSender(aaAddress);
    return builder;
  }

  async getUserOp(
    builder: IUserOperationBuilder,
    validAfter: number,
    validUntil: number,
  ): Promise<IUserOperation> {
    const _userOp = await this.clientInstance.buildUserOperation(
      builder,
      verifyingPaymaster({
        rpcUrl: this.paymasterUrl,
        validAfter: validAfter,
        validUntil: validUntil,
      }),
    );
    return _userOp;
  }

  getUserOpHash(userOp: IUserOperation): string {
    const hash = new UserOperationMiddlewareCtx(
      userOp,
      this.entryPointAddress,
      this.chainId,
    ).getUserOpHash();
    return hash;
  }

  async buildUserOpSignature(
    aaAddress: string,
    sessionKeyAddress: string,
    sessionKeyPrivKey: string,
    userOpHash: string,
    enableData: string,
    enableDataSignature: string,
    validAfter: number,
    validUntil: number,
  ): Promise<string> {
    const sig = getFunctionSelector('safeMint(address)');
    const permissions: Permission[] = [
      {
        target: this.nftAddress as Hex,
        valueLimit: 0,
        sig: sig,
        operation: Operation.Call,
        rules: [
          {
            condition: ParamCondition.EQUAL,
            offset: 0,
            param: pad(aaAddress as Hex, { size: 32 }),
          },
        ],
      },
    ];

    const sessionKeyData: SessionKeyData = {
      validAfter: 1,
      validUntil: validUntil,
      permissions,
      paymaster: this.paymasterAddress as Hex,
    }

    const sessionKeyWallet = new ethers.Wallet(
      sessionKeyPrivKey,
      this.provider,
    );

    const messageBytes = ethers.utils.arrayify(userOpHash);
    const sessionKeySigData = await sessionKeyWallet.signMessage(messageBytes);

    const encodedData = getEncodedData(sessionKeyData);
    const sessionKeySig = concatHex([
      sessionKeyAddress as Hex,
      sessionKeySigData as Hex,
      encodedData,
    ]);

    const enableDataLength = enableData.length / 2 - 1;
    const enableSigLength = enableDataSignature.length / 2 - 1;

    const validatorMode = '0x00000002';
    const signature = concatHex([
      validatorMode,
      pad(toHex(validAfter), { size: 6 }), // 6 bytes 4 - 10
      pad(toHex(1), { size: 6 }), // 6 bytes 10 - 16
      pad(this.sessionKeyExecutorAddress as Hex, { size: 20 }), // 20 bytes 16 - 36
      pad(this.serverAddress as Hex, { size: 20 }), // 20 bytes 36 - 56
      pad(toHex(enableDataLength), { size: 32 }),
      enableData as Hex,
      pad(toHex(enableSigLength), { size: 32 }),
      enableDataSignature as Hex,
      sessionKeySig as Hex,
    ]);
    return signature;
  }

  async sendUserOp(
    builder: IUserOperationBuilder,
    userOp: IUserOperation,
    userOpHash: string,
  ) {
    await this.clientInstance.sendUserOperationOnly(
      builder,
      userOp,
      userOpHash,
      {
        dryRun: false,
      }
    )
  }

  async getUserOpReceipt(userOpHash: string) {
    const block = await this.provider.getBlock('latest');
    while (true) {
      const events = await this.entryPointInstance.queryFilter(
        this.entryPointInstance.filters.UserOperationEvent(userOpHash),
        Math.max(0, block.number - 100)
      );
      if (events.length > 0) {
        return events[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
