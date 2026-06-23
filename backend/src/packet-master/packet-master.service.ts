import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacketMasterService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.packetMaster.findMany({
      where: { active: 1 },
      select: { code: true, description: true, stoneCode: true, stoneSub: true },
      orderBy: { code: 'asc' },
    });
  }
}
