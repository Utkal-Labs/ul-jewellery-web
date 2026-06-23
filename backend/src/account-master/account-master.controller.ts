import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountMasterService } from './account-master.service';

@UseGuards(JwtAuthGuard)
@Controller('account-master')
export class AccountMasterController {
  constructor(private service: AccountMasterService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('group') group?: string) {
    return this.service.findAll(search, group ? parseInt(group) : undefined);
  }

  @Get('payment-accounts')
  getPaymentAccounts() {
    return this.service.getPaymentAccounts();
  }
}
