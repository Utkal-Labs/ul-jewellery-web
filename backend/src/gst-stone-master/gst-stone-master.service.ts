import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GstStoneMasterService {
  constructor(private prisma: PrismaService) {}

  async getGstDetail(stoneCode: string, subCode: string, voucherDate: string) {
    // Raw SQL because FROMDT/TODT are actual TIMESTAMP columns — Prisma schema declared
    // them as VarChar(19) (matching VB6 migration), which causes type-conversion errors.
    // ISACTIVE uses VB6 convention: -1 = True, 0 = False.
    // Column names are uppercase and case-sensitive (created with quotes), so SELECT must quote them.
    const rows = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT "HSNCODE", "CGST", "SGST", "IGST", "FROMDT", "TODT"
        FROM   "GST_STONE_MASTER_DETL"
        WHERE  "STONECODE" = ${stoneCode}
          AND  "SUBCODE"   = ${subCode}
          AND  ("ISACTIVE" IS NULL OR "ISACTIVE" <> 0)
        ORDER BY "SRL" DESC
      `,
    );

    if (!rows.length) return null;

    const vd = new Date(voucherDate);
    const match =
      rows.find(r => {
        if (!r.FROMDT && !r.TODT) return true;
        return vd >= new Date(r.FROMDT) && vd <= new Date(r.TODT);
      }) ?? rows[0];

    return {
      hsnCode: match.HSNCODE != null ? Number(match.HSNCODE) : null,
      cgst:    Number(match.CGST ?? 0),
      sgst:    Number(match.SGST ?? 0),
      igst:    Number(match.IGST ?? 0),
    };
  }
}
