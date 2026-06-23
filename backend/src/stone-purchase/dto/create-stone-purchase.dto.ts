import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class GstSummaryLineDto {
  @IsOptional() @IsNumber() HSNCODE?: number;
  @IsOptional() @IsNumber() CGST_RT?: number;
  @IsOptional() @IsNumber() CGST_AMT?: number;
  @IsOptional() @IsNumber() SGST_RT?: number;
  @IsOptional() @IsNumber() SGST_AMT?: number;
  @IsOptional() @IsNumber() IGST_RT?: number;
  @IsOptional() @IsNumber() IGST_AMT?: number;
  @IsOptional() @IsNumber() CESS?: number;
  @IsOptional() @IsNumber() TOT_TAX?: number;
  @IsOptional() @IsNumber() TXABAMT?: number;
}

export class StoneLineDto {
  @IsOptional() @IsNumber() srl?: number;
  @IsOptional() @IsString() STONE_CODE?: string;
  @IsOptional() @IsString() STONE_SUB?: string;
  @IsOptional() @IsString() DESCRIPTION?: string;
  @IsOptional() @IsString() UOM?: string;
  @IsOptional() @IsNumber() PCS?: number;
  @IsOptional() @IsNumber() WEIGHT?: number;
  @IsOptional() @IsNumber() RATE?: number;
  @IsOptional() @IsNumber() AMOUNT?: number;
  @IsOptional() @IsString() PACKET_NO?: string;
  @IsOptional() @IsNumber() TAX_AMT?: number;
  @IsOptional() @IsNumber() HSNCODE?: number;
  @IsOptional() @IsNumber() CGST?: number;
  @IsOptional() @IsNumber() SGST?: number;
  @IsOptional() @IsNumber() IGST?: number;
}

export class PaymentLineDto {
  @IsOptional() @IsNumber() srl?: number;
  @IsOptional() @IsNumber() GL_CODE?: number;
  @IsOptional() @IsString() CHNO?: string;
  @IsOptional() @IsString() CHDATE?: string;
  @IsOptional() @IsNumber() AMOUNT?: number;
}

export class CreateStonePurchaseDto {
  @IsOptional() @IsString() VOUDATE?: string;
  @IsOptional() @IsString() DEALER_CODE?: string;
  @IsOptional() @IsString() REF_BILL_NO?: string;
  @IsOptional() @IsString() REF_BILL_DATE?: string;
  @IsOptional() @IsString() SALESMAN_CODE?: string;
  @IsOptional() @IsNumber() IS_CUSTOMER?: number;
  @IsOptional() @IsNumber() TOTAL_AMOUNT?: number;
  @IsOptional() @IsNumber() DISC_PER?: number;
  @IsOptional() @IsNumber() DISC_AMT?: number;
  @IsOptional() @IsNumber() TAX_AMT?: number;
  @IsOptional() @IsNumber() VAT_PER?: number;
  @IsOptional() @IsNumber() VAT_AMT?: number;
  @IsOptional() @IsNumber() TCS_TAXABLE_AMT?: number;
  @IsOptional() @IsNumber() TCS_PER?: number;
  @IsOptional() @IsNumber() TCS_AMT?: number;
  @IsOptional() @IsNumber() ROUND_OFF?: number;
  @IsOptional() @IsNumber() GRAND_TOTAL?: number;
  @IsOptional() @IsString() NARRATION?: string;
  @IsOptional() @IsString() PAN_NO?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoneLineDto)
  stoneLines: StoneLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  payments: PaymentLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GstSummaryLineDto)
  gstSummary?: GstSummaryLineDto[];
}
