import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoneMasterService } from './stone-master.service';

@UseGuards(JwtAuthGuard)
@Controller('stone-master')
export class StoneMasterController {
  constructor(private service: StoneMasterService) {}

  // Must be declared before @Get() to avoid NestJS route shadowing
  @Get('stone-codes')
  getStoneCodes() {
    return this.service.getStoneCodes();
  }

  @Get('sub-codes')
  getSubCodes(@Query('stoneCode') stoneCode: string) {
    return this.service.getSubCodes(stoneCode ?? '');
  }

  @Get()
  getDetail(
    @Query('stoneCode') stoneCode: string,
    @Query('subCode')   subCode:   string,
  ) {
    return this.service.getDetail(stoneCode ?? '', subCode ?? '');
  }
}
