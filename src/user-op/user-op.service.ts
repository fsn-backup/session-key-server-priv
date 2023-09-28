import { Injectable } from '@nestjs/common';
import { ExecService } from 'src/exec/exec.service';
import { LruCacheService } from '../lru-cache/lru-cache.service';
import { ethers } from 'ethers';

@Injectable()
export class UserOpService {
  constructor(
    private execService: ExecService,
    private lruCacheService: LruCacheService,
  ) { }

  onModuleInit() {
    this.startTask();
  }

  onModuleDestroy() {
    this.stopTask();
  }

  async startTask() {
    let provider: ethers.providers.JsonRpcProvider;
    while (!provider) {
      provider = this.execService.getProvider();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    let entryPointInstance: ethers.Contract;
    while (!entryPointInstance) {
      entryPointInstance = this.execService.getEntryPointInstance();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    let lastHandleBlockNumber = 0;
    const initialBlock = await provider.getBlock('latest');
    lastHandleBlockNumber = initialBlock.number;

    while (true) {
      const latestBlock = await provider.getBlock('latest');

      if (latestBlock.number > lastHandleBlockNumber) {
        const events = await entryPointInstance.queryFilter(
          entryPointInstance.filters.UserOperationEvent(),
          lastHandleBlockNumber + 1,
          latestBlock.number,
        );

        if (events.length > 0) {
          this.lruCacheService.setOp(
            events[0].args[0],
            events[0].transactionHash,
          );
        }

        lastHandleBlockNumber = latestBlock.number;
      }

      // await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }


  stopTask() { }
}
