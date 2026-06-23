import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  // Single-table
  @Get('stone-master-list')
  stoneMasterList(
    @Query('q')      q?: string,
    @Query('active') active?: string,
  ) {
    return this.service.stoneMasterList({ q, active });
  }

  // Temporary-table
  @Get('stone-balance')
  stoneBalance(
    @Query('asOf')      asOf?: string,
    @Query('stoneCode') stoneCode?: string,
  ) {
    return this.service.stoneBalanceAsOfDate({ asOf, stoneCode });
  }

  // Sub-report (master + detail)
  @Get('customer-ledger')
  customerLedger(
    @Query('glCode') glCode: string,
    @Query('from')   from?: string,
    @Query('to')     to?: string,
  ) {
    return this.service.customerLedger({ glCode, from, to });
  }

  @Get('ledger-account-options')
  ledgerAccountOptions(@Query('q') q?: string) {
    return this.service.ledgerAccountOptions(q);
  }
}
