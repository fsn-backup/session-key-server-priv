import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ExecService } from './exec.service';

@Controller('exec')
export class ExecController {
  constructor(private readonly execService: ExecService) { }

  @Post('sync')
  async sync(@Body() body: any): Promise<string> {
    console.log(body);

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
    const txReceipt = await this.execService.getUserOpReceipt(userOpHash);

    return txReceipt.transactionHash;
  }
}
