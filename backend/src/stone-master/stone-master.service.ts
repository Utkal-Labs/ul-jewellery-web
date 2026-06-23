import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Maps DB UOM string to VB6 unit integer (1-4)
const UOM_TO_UNIT: Record<string, number> = {
  'Ct.': 1, 'Ct': 1, 'CT': 1, 'ct': 1,
  'Gm.': 2, 'Gm': 2, 'GM': 2, 'gm': 2, 'Gms': 2, 'g': 2,
  'Rt.': 3, 'Rt': 3, 'RT': 3, 'rt': 3,
  'Cn.': 4, 'Cn': 4, 'CN': 4, 'Pcs': 4, 'PCS': 4, 'No.': 4, 'Nos': 4,
};

@Injectable()
export class StoneMasterService {
  constructor(private prisma: PrismaService) {}

  async getStoneCodes(): Promise<string[]> {
    const rows = await this.prisma.stoneMaster.findMany({
      where: { active: 1 },
      select: { stoneCode: true },
      distinct: ['stoneCode'],
      orderBy: { stoneCode: 'asc' },
    });
    return rows.map(r => r.stoneCode);
  }

  async getSubCodes(stoneCode: string): Promise<string[]> {
    const rows = await this.prisma.stoneMaster.findMany({
      where: { stoneCode, active: 1 },
      select: { stoneSub: true },
      orderBy: { stoneSub: 'asc' },
    });
    return rows.map(r => r.stoneSub);
  }

  async getDetail(stoneCode: string, subCode: string) {
    const stone = await this.prisma.stoneMaster.findUnique({
      where: { stoneCode_stoneSub: { stoneCode, stoneSub: subCode } },
    });
    if (!stone) return null;
    return {
      stoneName1: stone.description ?? '',
      stoneName:  stone.description ?? '',
      unit: UOM_TO_UNIT[stone.uom?.trim() ?? ''] ?? 2,
    };
  }
}
