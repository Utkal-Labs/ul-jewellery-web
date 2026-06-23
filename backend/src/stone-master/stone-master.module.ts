import { Module } from '@nestjs/common';
import { StoneMasterService } from './stone-master.service';
import { StoneMasterController } from './stone-master.controller';

@Module({
  providers: [StoneMasterService],
  controllers: [StoneMasterController],
})
export class StoneMasterModule {}
