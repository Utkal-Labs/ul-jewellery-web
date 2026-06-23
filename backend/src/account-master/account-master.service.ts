import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountMasterService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string, accGroup?: number) {
    return this.prisma.accountMaster.findMany({
      where: {
        ...(search ? { accName: { contains: search, mode: 'insensitive' } } : {}),
        ...(accGroup ? { accGroup } : {}),
      },
      include: { group: true },
      orderBy: { accName: 'asc' },
      take: 100,
    });
  }

  // Returns cash + bank accounts for the "Amount Paid By" grid
  getPaymentAccounts() {
    return this.prisma.accountMaster.findMany({
      where: {
        accGroup: { in: [1, 2] }, // 1=Bank, 2=Cash
      },
      select: { glCode: true, accName: true, accGroup: true },
      orderBy: { accName: 'asc' },
    });
  }
}
