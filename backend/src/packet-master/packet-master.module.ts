import { Module } from '@nestjs/common';
import { PacketMasterService } from './packet-master.service';
import { PacketMasterController } from './packet-master.controller';

@Module({
  providers: [PacketMasterService],
  controllers: [PacketMasterController],
})
export class PacketMasterModule {}
