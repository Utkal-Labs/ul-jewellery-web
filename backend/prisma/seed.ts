import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash, role: 1, active: 1 },
  });

  // Company setup
  await prisma.setupInfo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      compName: 'My Jewellery Shop',
      address1: '123 Main Street',
      address2: 'City',
      address3: 'State',
      phone: '9999999999',
      stateCode: '21',
    },
  });

  // Transaction serial numbers
  const serialCodes = [
    { trancode: 'ISP', prefix: 'ISP', currentno: 0 },
    { trancode: 'SRN', prefix: 'SRN', currentno: 0 },
    { trancode: 'JOB', prefix: 'JOB', currentno: 0 },
  ];
  for (const s of serialCodes) {
    await prisma.serialInfo.upsert({
      where: { trancode: s.trancode },
      update: {},
      create: { trancode: s.trancode, prefix: s.prefix, currentno: s.currentno, printStatus: 0, tsave: 1, passwordActive: 0 },
    });
  }

  // ID headers
  const idHeaders = [
    { trancode: 'ISP', prefix: 'ISP', currentno: 0, description: 'Stone Purchase' },
    { trancode: 'SRN', prefix: 'SRN', currentno: 0, description: 'Stone Return' },
    { trancode: 'JOB', prefix: 'JOB', currentno: 0, description: 'Job Work' },
  ];
  for (const h of idHeaders) {
    await prisma.idHeader.upsert({
      where: { trancode: h.trancode },
      update: {},
      create: h,
    });
  }

  // Account groups
  const accountGroups = [
    { accGroup: 1,  accName: 'Capital Account',       plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'CAP',  asLi: 'L', delAl: 'N', bal: 'Y', side: 'C', printno: '1' },
    { accGroup: 2,  accName: 'Loans (Liability)',      plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'LOA',  asLi: 'L', delAl: 'N', bal: 'Y', side: 'C', printno: '2' },
    { accGroup: 3,  accName: 'Current Liabilities',   plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'CUL',  asLi: 'L', delAl: 'N', bal: 'Y', side: 'C', printno: '3' },
    { accGroup: 4,  accName: 'Fixed Assets',           plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'FIX',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '4' },
    { accGroup: 5,  accName: 'Investments',            plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'INV',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '5' },
    { accGroup: 6,  accName: 'Current Assets',         plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'CUA',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '6' },
    { accGroup: 7,  accName: 'Sundry Debtors',         plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'DEB',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '7' },
    { accGroup: 8,  accName: 'Sundry Creditors',       plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'CRE',  asLi: 'L', delAl: 'N', bal: 'Y', side: 'C', printno: '8' },
    { accGroup: 9,  accName: 'Sales Account',          plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'SAL',  asLi: 'I', delAl: 'N', bal: 'Y', side: 'C', printno: '9' },
    { accGroup: 10, accName: 'Purchase Account',       plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'PUR',  asLi: 'E', delAl: 'N', bal: 'Y', side: 'D', printno: '10' },
    { accGroup: 11, accName: 'Direct Expenses',        plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'DIE',  asLi: 'E', delAl: 'N', bal: 'Y', side: 'D', printno: '11' },
    { accGroup: 12, accName: 'Indirect Expenses',      plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'INE',  asLi: 'E', delAl: 'N', bal: 'Y', side: 'D', printno: '12' },
    { accGroup: 13, accName: 'Direct Income',          plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'DII',  asLi: 'I', delAl: 'N', bal: 'Y', side: 'C', printno: '13' },
    { accGroup: 14, accName: 'Indirect Income',        plbl: 'P', opbal: 0, incExp: 'Y', groupHead: 'INI',  asLi: 'I', delAl: 'N', bal: 'Y', side: 'C', printno: '14' },
    { accGroup: 15, accName: 'Bank Accounts',          plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'BNK',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '15' },
    { accGroup: 16, accName: 'Cash in Hand',           plbl: 'B', opbal: 1, incExp: 'N', groupHead: 'CSH',  asLi: 'A', delAl: 'N', bal: 'Y', side: 'D', printno: '16' },
  ];
  for (const g of accountGroups) {
    await prisma.accountGroup.upsert({
      where: { accGroup: g.accGroup },
      update: {},
      create: g,
    });
  }

  // GST State master (all Indian states)
  const gstStates = [
    { id: 1,  stateName: 'Jammu & Kashmir',        stateCode: '01', country: 'India' },
    { id: 2,  stateName: 'Himachal Pradesh',        stateCode: '02', country: 'India' },
    { id: 3,  stateName: 'Punjab',                  stateCode: '03', country: 'India' },
    { id: 4,  stateName: 'Chandigarh',              stateCode: '04', country: 'India' },
    { id: 5,  stateName: 'Uttarakhand',             stateCode: '05', country: 'India' },
    { id: 6,  stateName: 'Haryana',                 stateCode: '06', country: 'India' },
    { id: 7,  stateName: 'Delhi',                   stateCode: '07', country: 'India' },
    { id: 8,  stateName: 'Rajasthan',               stateCode: '08', country: 'India' },
    { id: 9,  stateName: 'Uttar Pradesh',           stateCode: '09', country: 'India' },
    { id: 10, stateName: 'Bihar',                   stateCode: '10', country: 'India' },
    { id: 11, stateName: 'Sikkim',                  stateCode: '11', country: 'India' },
    { id: 12, stateName: 'Arunachal Pradesh',       stateCode: '12', country: 'India' },
    { id: 13, stateName: 'Nagaland',                stateCode: '13', country: 'India' },
    { id: 14, stateName: 'Manipur',                 stateCode: '14', country: 'India' },
    { id: 15, stateName: 'Mizoram',                 stateCode: '15', country: 'India' },
    { id: 16, stateName: 'Tripura',                 stateCode: '16', country: 'India' },
    { id: 17, stateName: 'Meghalaya',               stateCode: '17', country: 'India' },
    { id: 18, stateName: 'Assam',                   stateCode: '18', country: 'India' },
    { id: 19, stateName: 'West Bengal',             stateCode: '19', country: 'India' },
    { id: 20, stateName: 'Jharkhand',               stateCode: '20', country: 'India' },
    { id: 21, stateName: 'Odisha',                  stateCode: '21', country: 'India' },
    { id: 22, stateName: 'Chhattisgarh',            stateCode: '22', country: 'India' },
    { id: 23, stateName: 'Madhya Pradesh',          stateCode: '23', country: 'India' },
    { id: 24, stateName: 'Gujarat',                 stateCode: '24', country: 'India' },
    { id: 25, stateName: 'Daman & Diu',             stateCode: '25', country: 'India' },
    { id: 26, stateName: 'Dadra & Nagar Haveli',    stateCode: '26', country: 'India' },
    { id: 27, stateName: 'Maharashtra',             stateCode: '27', country: 'India' },
    { id: 28, stateName: 'Andhra Pradesh (Old)',    stateCode: '28', country: 'India' },
    { id: 29, stateName: 'Karnataka',               stateCode: '29', country: 'India' },
    { id: 30, stateName: 'Goa',                     stateCode: '30', country: 'India' },
    { id: 31, stateName: 'Lakshadweep',             stateCode: '31', country: 'India' },
    { id: 32, stateName: 'Kerala',                  stateCode: '32', country: 'India' },
    { id: 33, stateName: 'Tamil Nadu',              stateCode: '33', country: 'India' },
    { id: 34, stateName: 'Puducherry',              stateCode: '34', country: 'India' },
    { id: 35, stateName: 'Andaman & Nicobar',       stateCode: '35', country: 'India' },
    { id: 36, stateName: 'Telangana',               stateCode: '36', country: 'India' },
    { id: 37, stateName: 'Andhra Pradesh',          stateCode: '37', country: 'India' },
    { id: 38, stateName: 'Ladakh',                  stateCode: '38', country: 'India' },
  ];
  for (const s of gstStates) {
    await prisma.gstStateMaster.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  console.log('Seed completed. Login: admin / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());