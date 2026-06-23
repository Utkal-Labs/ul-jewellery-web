import { Module } from '@nestjs/common';
import { SalesmanMasterService } from './salesman-master.service';
import { SalesmanMasterController } from './salesman-master.controller';

@Module({
  providers: [SalesmanMasterService],
  controllers: [SalesmanMasterController],
})
export class SalesmanMasterModule {}
