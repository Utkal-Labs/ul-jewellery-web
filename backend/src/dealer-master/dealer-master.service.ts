import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DealerMasterService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.dealerMaster.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { code: true, name: true, address1: true, address2: true, address3: true, gstin: true, glCode: true, idState: true, state: true },
      orderBy: { name: 'asc' },
    });
  }

  findByCode(code: string) {
    return this.prisma.dealerMaster.findUnique({
      where: { code },
      include: { account: true },
    });
  }
}
