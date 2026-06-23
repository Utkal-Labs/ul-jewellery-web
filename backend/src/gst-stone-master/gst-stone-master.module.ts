import { Module } from '@nestjs/common';
import { GstStoneMasterService } from './gst-stone-master.service';
import { GstStoneMasterController } from './gst-stone-master.controller';

@Module({
  providers: [GstStoneMasterService],
  controllers: [GstStoneMasterController],
})
export class GstStoneMasterModule {}
