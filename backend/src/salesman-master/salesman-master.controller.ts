import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesmanMasterService } from './salesman-master.service';

@UseGuards(JwtAuthGuard)
@Controller('salesman-master')
export class SalesmanMasterController {
  constructor(private service: SalesmanMasterService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }
}
