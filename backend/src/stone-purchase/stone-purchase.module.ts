import { Module } from '@nestjs/common';
import { StonePurchaseService } from './stone-purchase.service';
import { StonePurchaseController } from './stone-purchase.controller';

@Module({
  providers: [StonePurchaseService],
  controllers: [StonePurchaseController],
})
export class StonePurchaseModule {}
