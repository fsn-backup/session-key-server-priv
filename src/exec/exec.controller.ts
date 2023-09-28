import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ExecService } from './exec.service';
import { LruCacheService } from '../lru-cache/lru-cache.service';

@Controller('exec')
export class ExecController {
  constructor(
    private readonly execService: ExecService,
    private lruCacheService: LruCacheService
  ) { }

  @Post('sync')
  async sync(@Body() body: any): Promise<string> {
    if (!body.userAddress) {
      return '0x';
    }
    if (!body.validAfter) {
      return '0x';
    }
    if (!body.validUntil) {
      return '0x';
    }
    if (!body.sessionKeyAddress) {
      return '0x';
    }
    if (!body.sessionKeyPrivKey) {
      return '0x';
    }
    if (!body.enableData) {
      return '0x';
    }
    if (!body.enableDataSignature) {
      return '0x';
    }

    try {
      const userAddress = body.userAddress;
      const validAfter = parseInt(body.validAfter);
      const validUntil = parseInt(body.validUntil);
      const sessionKeyAddress = body.sessionKeyAddress;
      const sessionKeyPrivKey = body.sessionKeyPrivKey;
      const enableData = body.enableData;
      const enableDataSignature = body.enableDataSignature;

      const aaAddress = await this.execService.getAAAddress(userAddress, 1);
      const call = this.execService.buildMintNFTCall(aaAddress);
      const builder = this.execService.getBuilder(call, aaAddress);
      const userOp = await this.execService.getUserOp(
        builder,
        validAfter,
        validUntil,
      );
      const userOpHash = this.execService.getUserOpHash(userOp);
      const signature = await this.execService.buildUserOpSignature(
        aaAddress,
        sessionKeyAddress,
        sessionKeyPrivKey,
        userOpHash,
        enableData,
        enableDataSignature,
        validAfter,
        validUntil,
      );
      userOp.sender = aaAddress;
      userOp.signature = signature;
      await this.execService.sendUserOp(builder, userOp, userOpHash);
      const txReceipt = await this.lruCacheService.getOp(userOpHash);
      if (!txReceipt) {
        throw new Error('txReceipt is null');
      }
      return txReceipt;
    } catch (error: any) {
      console.log(error);
      return '0x';
    }
  }
}
