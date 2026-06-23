import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StonePurchaseModule } from './stone-purchase/stone-purchase.module';
import { AccountMasterModule } from './account-master/account-master.module';
import { DealerMasterModule } from './dealer-master/dealer-master.module';
import { SalesmanMasterModule } from './salesman-master/salesman-master.module';
import { StoneMasterModule } from './stone-master/stone-master.module';
import { PacketMasterModule } from './packet-master/packet-master.module';
import { GstStoneMasterModule } from './gst-stone-master/gst-stone-master.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StonePurchaseModule,
    AccountMasterModule,
    DealerMasterModule,
    SalesmanMasterModule,
    StoneMasterModule,
    PacketMasterModule,
    GstStoneMasterModule,
    ReportsModule,
  ],
})
export class AppModule {}
