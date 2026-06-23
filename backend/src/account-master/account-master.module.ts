import { Module } from '@nestjs/common';
import { AccountMasterService } from './account-master.service';
import { AccountMasterController } from './account-master.controller';

@Module({
  providers: [AccountMasterService],
  controllers: [AccountMasterController],
})
export class AccountMasterModule {}
