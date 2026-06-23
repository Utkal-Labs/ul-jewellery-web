import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PacketMasterService } from './packet-master.service';

@UseGuards(JwtAuthGuard)
@Controller('packet-master')
export class PacketMasterController {
  constructor(private service: PacketMasterService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
