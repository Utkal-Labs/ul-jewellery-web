import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StonePurchaseService } from './stone-purchase.service';
import { CreateStonePurchaseDto } from './dto/create-stone-purchase.dto';

@UseGuards(JwtAuthGuard)
@Controller('stone-purchase')
export class StonePurchaseController {
  constructor(private service: StonePurchaseService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('register')
  getRegister(
    @Query('from')        from?: string,
    @Query('to')          to?: string,
    @Query('dealerCode')  dealerCode?: string,
    @Query('trancode')    trancode?: string,
    @Query('vounum')      vounum?: string,
    @Query('vounumFrom')  vounumFrom?: string,
    @Query('vounumTo')    vounumTo?: string,
    @Query('minAmount')   minAmount?: string,
  ) {
    return this.service.getRegister({
      from, to, dealerCode, trancode, vounum, vounumFrom, vounumTo,
      minAmount: minAmount ? +minAmount : undefined,
    });
  }

  @Get('next-vounum')
  nextVounum() {
    return this.service.previewVounum();
  }

  @Get('first')
  findFirst() {
    return this.service.findFirst();
  }

  @Get('last')
  findLast() {
    return this.service.findLast();
  }

  @Get('next/:vounum')
  findNext(@Param('vounum') vounum: string) {
    return this.service.findNext(vounum);
  }

  @Get('prev/:vounum')
  findPrev(@Param('vounum') vounum: string) {
    return this.service.findPrev(vounum);
  }

  @Get(':vounum/journal')
  getJournal(@Param('vounum') vounum: string) {
    return this.service.getJournal(vounum);
  }

  @Get(':vounum/print-data')
  getPrintData(@Param('vounum') vounum: string) {
    return this.service.getPrintData(vounum);
  }

  @Get(':vounum')
  findOne(@Param('vounum') vounum: string) {
    return this.service.findOne(vounum);
  }

  @Post()
  create(@Body() dto: CreateStonePurchaseDto, @Req() req: any) {
    return this.service.create(dto, req.user.username);
  }

  @Put(':vounum')
  update(
    @Param('vounum') vounum: string,
    @Body() dto: CreateStonePurchaseDto,
    @Req() req: any,
  ) {
    return this.service.update(vounum, dto, req.user.username);
  }

  @Delete(':vounum')
  remove(@Param('vounum') vounum: string, @Req() req: any) {
    return this.service.remove(vounum, req.user.username);
  }

  @Patch(':vounum/cancel')
  cancel(@Param('vounum') vounum: string, @Req() req: any) {
    return this.service.cancel(vounum, req.user.username);
  }
}
