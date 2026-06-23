import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GstStoneMasterService } from './gst-stone-master.service';

@UseGuards(JwtAuthGuard)
@Controller('gst-stone-master')
export class GstStoneMasterController {
  constructor(private service: GstStoneMasterService) {}

  @Get()
  getGstDetail(
    @Query('stoneCode')   stoneCode:   string,
    @Query('subCode')     subCode:     string,
    @Query('voucherDate') voucherDate: string,
  ) {
    return this.service.getGstDetail(
      stoneCode   ?? '',
      subCode     ?? '',
      voucherDate ?? new Date().toISOString().substring(0, 10),
    );
  }
}
