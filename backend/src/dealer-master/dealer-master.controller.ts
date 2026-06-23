import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DealerMasterService } from './dealer-master.service';

@UseGuards(JwtAuthGuard)
@Controller('dealer-master')
export class DealerMasterController {
  constructor(private service: DealerMasterService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }
}
