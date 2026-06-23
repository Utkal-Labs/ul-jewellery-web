import { Module } from '@nestjs/common';
import { DealerMasterService } from './dealer-master.service';
import { DealerMasterController } from './dealer-master.controller';

@Module({
  providers: [DealerMasterService],
  controllers: [DealerMasterController],
})
export class DealerMasterModule {}
