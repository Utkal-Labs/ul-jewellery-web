import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesmanMasterService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.salesmanMaster.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { code: true, name: true, locid: true },
      orderBy: { code: 'asc' },
    });
  }

  findByCode(code: string) {
    return this.prisma.salesmanMaster.findUnique({ where: { code } });
  }
}
