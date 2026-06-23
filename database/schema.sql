-- ============================================================
-- Jewellery Management System - PostgreSQL Schema
-- Exact column names preserved from MS Access MDB files
-- Source: WINGOLD.mdb, TRANS.mdb, Customer.mdb, SETUP.mdb
-- ============================================================

-- Drop tables in dependency order
DROP TABLE IF EXISTS "USER_CANCELLED_BY" CASCADE;
DROP TABLE IF EXISTS "USER_DELETED_BY" CASCADE;
DROP TABLE IF EXISTS "USER_MODIFIED_BY" CASCADE;
DROP TABLE IF EXISTS "USER_ADDITION_BY" CASCADE;
DROP TABLE IF EXISTS "SMSTRANSACTION" CASCADE;
DROP TABLE IF EXISTS "GST_PRINT_TAX" CASCADE;
DROP TABLE IF EXISTS "GST_TAXSUMMARY_DETAIL" CASCADE;
DROP TABLE IF EXISTS "CUSTOMER_PAID_AMOUNT" CASCADE;
DROP TABLE IF EXISTS "STONE_TRANS" CASCADE;
DROP TABLE IF EXISTS "STONE_PURCHASE" CASCADE;
DROP TABLE IF EXISTS "ACCOUNT_TRANS" CASCADE;
DROP TABLE IF EXISTS "CASHMEMO_TRANS" CASCADE;
DROP TABLE IF EXISTS "CASHMEMO_MASTER" CASCADE;
DROP TABLE IF EXISTS "CASH_STONE" CASCADE;
DROP TABLE IF EXISTS "ADDRESSBOOK" CASCADE;
DROP TABLE IF EXISTS "PACKET_MASTER_OPENING" CASCADE;
DROP TABLE IF EXISTS "PACKET_MASTER" CASCADE;
DROP TABLE IF EXISTS "GST_STONE_MASTER_DETL" CASCADE;
DROP TABLE IF EXISTS "STONE_MASTER" CASCADE;
DROP TABLE IF EXISTS "GST_CODE_MASTER" CASCADE;
DROP TABLE IF EXISTS "GST_STATE_MASTER" CASCADE;
DROP TABLE IF EXISTS "SALESMAN_MASTER" CASCADE;
DROP TABLE IF EXISTS "DEALER_MASTER" CASCADE;
DROP TABLE IF EXISTS "ARTISAN_MASTER" CASCADE;
DROP TABLE IF EXISTS "ACCOUNT_MASTER" CASCADE;
DROP TABLE IF EXISTS "ACCOUNT_GROUP" CASCADE;
DROP TABLE IF EXISTS "SERIAL_INFO" CASCADE;
DROP TABLE IF EXISTS "TC_WISE_PASSWORD_DETAIL" CASCADE;
DROP TABLE IF EXISTS "SETUP_INFO" CASCADE;
DROP TABLE IF EXISTS "SETUP_INFO2" CASCADE;
DROP TABLE IF EXISTS "BRANCH_MASTER" CASCADE;
DROP TABLE IF EXISTS "YEARLIST" CASCADE;
DROP TABLE IF EXISTS "ID_HEADER" CASCADE;
DROP TABLE IF EXISTS "USERS" CASCADE;

-- ============================================================
-- SYSTEM / CONFIG TABLES
-- ============================================================

CREATE TABLE "SETUP_INFO" (
    "ID"              SERIAL PRIMARY KEY,
    "COMP_NAME"       VARCHAR(60),
    "ADDRESS1"        VARCHAR(60),
    "ADDRESS2"        VARCHAR(60),
    "ADDRESS3"        VARCHAR(60),
    "PHONE"           VARCHAR(20),
    "FAX"             VARCHAR(20),
    "PIN_CODE"        VARCHAR(10),
    "COMP_PAN"        VARCHAR(15),
    "COMP_VAT"        VARCHAR(20),
    "COMP_CST"        VARCHAR(20),
    "COMP_TIN"        VARCHAR(20),
    "COMP_IEC"        VARCHAR(20),
    "COMP_MAILID"     VARCHAR(60),
    "COMP_CIN"        VARCHAR(25),
    "GSTINNO"         VARCHAR(16),
    "StateCode"       VARCHAR(3),
    "SENDSMS"         SMALLINT DEFAULT 0,
    "SMS_USER"        VARCHAR(30),
    "SMS_PASSWORD"    VARCHAR(30),
    "UserNo"          VARCHAR(5),
    "PasswordActive"  SMALLINT DEFAULT 0,
    "TcsApply"        SMALLINT DEFAULT 0,
    "EINV_ACTIVE"     SMALLINT DEFAULT 0
);

CREATE TABLE "SETUP_INFO2" (
    "ID"              SERIAL PRIMARY KEY,
    "CDKEY"           VARCHAR(50),
    "EFUSERNAME"      VARCHAR(30),
    "EFPASSWORD"      VARCHAR(30),
    "EINVUSERNAME"    VARCHAR(30),
    "EINVPASSWORD"    VARCHAR(30)
);

CREATE TABLE "BRANCH_MASTER" (
    "BILLNO"          VARCHAR(10) PRIMARY KEY,
    "BRANCH_NAME"     VARCHAR(60),
    "ADDRESS1"        VARCHAR(60),
    "ADDRESS2"        VARCHAR(60),
    "ADDRESS3"        VARCHAR(60),
    "LOCID"           VARCHAR(2),
    "StateCode"       VARCHAR(3),
    "GSTINNO"         VARCHAR(16)
);

CREATE TABLE "YEARLIST" (
    "ID"              SERIAL PRIMARY KEY,
    "DIRECTORY"       VARCHAR(100),
    "FROMDATE"        VARCHAR(19),
    "TODATE"          VARCHAR(19),
    "EINV_ACTIVE"     SMALLINT DEFAULT 0,
    "YEAR_NO"         SMALLINT
);

CREATE TABLE "ID_HEADER" (
    "TRANCODE"        VARCHAR(3) PRIMARY KEY,
    "PREFIX"          VARCHAR(5),
    "CURRENTNO"       INTEGER DEFAULT 0,
    "SUFFIX"          VARCHAR(5),
    "WORKVOU"         VARCHAR(10),
    "DESCRIPTION"     VARCHAR(50)
);

CREATE TABLE "USERS" (
    "ID"              SERIAL PRIMARY KEY,
    "USERNAME"        VARCHAR(30) NOT NULL UNIQUE,
    "PASSWORD_HASH"   VARCHAR(200) NOT NULL,
    "ROLE"            SMALLINT DEFAULT 0,
    "LOCID"           VARCHAR(2),
    "ACTIVE"          SMALLINT DEFAULT 1,
    "CREATED_AT"      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "TC_WISE_PASSWORD_DETAIL" (
    "TC"              VARCHAR(3),
    "UserName"        VARCHAR(30),
    "MOD_PASSWORD"    VARCHAR(20),
    "DEL_PASSWORD"    VARCHAR(20),
    "CAN_PASSWORD"    VARCHAR(20),
    PRIMARY KEY ("TC", "UserName")
);

CREATE TABLE "SERIAL_INFO" (
    "TRANCODE"        VARCHAR(3) PRIMARY KEY,
    "PRINT_STATUS"    SMALLINT DEFAULT 0,
    "TSAVE"           SMALLINT DEFAULT 1,
    "PasswordActive"  SMALLINT DEFAULT 0,
    "PREFIX"          VARCHAR(5),
    "CURRENTNO"       INTEGER DEFAULT 0
);

-- ============================================================
-- ACCOUNT HIERARCHY
-- ============================================================

CREATE TABLE "ACCOUNT_GROUP" (
    "ACC_GROUP"       INTEGER PRIMARY KEY,
    "ACC_NAME"        VARCHAR(25),
    "PLBL"            VARCHAR(1),
    "OPBAL"           SMALLINT DEFAULT 0,
    "INC_EXP"         VARCHAR(1),
    "GROUP_HEAD"      VARCHAR(5),
    "AS_LI"           VARCHAR(1),
    "DEL_AL"          VARCHAR(1),
    "BAL"             VARCHAR(1),
    "SIDE"            VARCHAR(1),
    "PRINTNO"         VARCHAR(1),
    "MergeData"       VARCHAR(1)
);

CREATE TABLE "ACCOUNT_MASTER" (
    "GL_CODE"         INTEGER PRIMARY KEY,
    "ACC_NAME"        VARCHAR(44),
    "ACC_GROUP"       INTEGER REFERENCES "ACCOUNT_GROUP"("ACC_GROUP"),
    "OPENING"         SMALLINT DEFAULT 0,
    "LAST_YEAR_BAL"   SMALLINT DEFAULT 0,
    "CURRENT_BAL"     NUMERIC(12,2) DEFAULT 0,
    "TEMP_BAL"        NUMERIC(12,2) DEFAULT 0,
    "UP_ALLOWED"      VARCHAR(1),
    "FORMER_NAME"     VARCHAR(44),
    "ADDRESS1"        VARCHAR(50),
    "ADDRESS2"        VARCHAR(50),
    "ADDRESS3"        VARCHAR(50),
    "ITFILENO"        VARCHAR(20),
    "LOCID"           VARCHAR(2),
    "TRANAMT"         VARCHAR(20),
    "nullfydata"      VARCHAR(1),
    "A_Type"          VARCHAR(1),
    "ACC_CODE"        VARCHAR(10),
    "Credit_Limit"    VARCHAR(15)
);

-- ============================================================
-- MASTER TABLES
-- ============================================================

CREATE TABLE "DEALER_MASTER" (
    "CODE"            VARCHAR(4) PRIMARY KEY,
    "NAME"            VARCHAR(50),
    "ADDRESS1"        VARCHAR(50),
    "ADDRESS2"        VARCHAR(50),
    "ADDRESS3"        VARCHAR(50),
    "PHONE"           VARCHAR(15),
    "FAX"             VARCHAR(15),
    "CONTACTPERSON"   VARCHAR(30),
    "LISCENCENO"      VARCHAR(20),
    "GL_CODE"         INTEGER REFERENCES "ACCOUNT_MASTER"("GL_CODE"),
    "UNREGISTERED"    SMALLINT DEFAULT 0,
    "BALSTD"          NUMERIC(7,5),
    "BALACC"          NUMERIC(12,2),
    "VAT_NO"          VARCHAR(20),
    "city"            VARCHAR(30),
    "State"           VARCHAR(30),
    "Location"        VARCHAR(30),
    "District"        VARCHAR(30),
    "Wastege"         SMALLINT DEFAULT 0,
    "Creditdays"      SMALLINT DEFAULT 0,
    "MetalPercent"    SMALLINT DEFAULT 0,
    "AccPercent"      SMALLINT DEFAULT 0,
    "FaxNo"           VARCHAR(15),
    "MobilleNo"       VARCHAR(15),
    "DoB"             VARCHAR(19),
    "MAnniv"          VARCHAR(19),
    "MailId"          VARCHAR(60),
    "Website"         VARCHAR(60),
    "ID_STATE"        SMALLINT,
    "GSTIN"           VARCHAR(16),
    "Tcs_Amt"         NUMERIC(12,2) DEFAULT 0,
    "TcsApply"        SMALLINT DEFAULT 0
);

CREATE TABLE "SALESMAN_MASTER" (
    "CODE"            VARCHAR(4) PRIMARY KEY,
    "NAME"            VARCHAR(30),
    "ADDRESS1"        VARCHAR(50),
    "ADDRESS2"        VARCHAR(50),
    "ADDRESS3"        VARCHAR(50),
    "PHONE"           VARCHAR(15),
    "FAX"             VARCHAR(15),
    "CONTACTPERSON"   VARCHAR(30),
    "LISCENCENO"      VARCHAR(20),
    "GL_CODE"         INTEGER,
    "LOCID"           VARCHAR(2),
    "TrgAmt"          NUMERIC(12,2) DEFAULT 0,
    "vat_no"          VARCHAR(20)
);

CREATE TABLE "ARTISAN_MASTER" (
    "CODE"            VARCHAR(4) PRIMARY KEY,
    "NAME"            VARCHAR(50),
    "ADDRESS1"        VARCHAR(50),
    "ADDRESS2"        VARCHAR(50),
    "ADDRESS3"        VARCHAR(50),
    "PHONE"           VARCHAR(15),
    "GL_CODE"         INTEGER REFERENCES "ACCOUNT_MASTER"("GL_CODE"),
    "LOCID"           VARCHAR(2),
    "GSTIN"           VARCHAR(16),
    "ID_STATE"        SMALLINT
);

CREATE TABLE "ADDRESSBOOK" (
    "CLIENTSERIAL"    SERIAL PRIMARY KEY,
    "FNAME"           VARCHAR(5),
    "NAME"            VARCHAR(50),
    "ADDRESS1"        VARCHAR(50),
    "ADDRESS2"        VARCHAR(50),
    "ADDRESS3"        VARCHAR(50),
    "CITY"            VARCHAR(30),
    "STATE"           VARCHAR(30),
    "PHONE"           VARCHAR(15),
    "FAX"             VARCHAR(15),
    "CASHOPENING"     SMALLINT DEFAULT 0,
    "BAL"             NUMERIC(12,2) DEFAULT 0,
    "AMOUNT"          INTEGER DEFAULT 0,
    "BIRTHDAY"        VARCHAR(19),
    "MA"              VARCHAR(19),
    "GL_CODE"         INTEGER REFERENCES "ACCOUNT_MASTER"("GL_CODE"),
    "mobile"          VARCHAR(15),
    "ID_GROUP"        VARCHAR(2),
    "SPNAME"          VARCHAR(50),
    "SPDOB"           VARCHAR(19),
    "SPMOBILE"        VARCHAR(15),
    "DISTRICT"        VARCHAR(30),
    "LOCATION"        VARCHAR(30),
    "LII"             VARCHAR(1),
    "TRFR"            VARCHAR(1),
    "INPER"           VARCHAR(5),
    "LOCID"           VARCHAR(2),
    "discper"         VARCHAR(5),
    "Email"           VARCHAR(60),
    "MCHRG"           VARCHAR(10),
    "MKGTYPE"         VARCHAR(5),
    "DEPTLINK"        SMALLINT,
    "REEDEMPOINT"     NUMERIC(10,2) DEFAULT 0,
    "lblPrint"        VARCHAR(1),
    "Religion"        VARCHAR(20),
    "IsPrnt"          VARCHAR(1),
    "PANNO"           VARCHAR(12),
    "BROKARAGE_PER"   NUMERIC(5,2),
    "TINNO"           VARCHAR(20),
    "PREVYEAR_MPOINT" NUMERIC(10,2) DEFAULT 0,
    "ID_STATE"        VARCHAR(2),
    "GstIn"           VARCHAR(16),
    "Gender"          VARCHAR(1),
    "ID_TYPE"         VARCHAR(5),
    "Id_No"           VARCHAR(20),
    "Tcs_Amt"         NUMERIC(12,2) DEFAULT 0,
    "TcsApply"        SMALLINT DEFAULT 0
);

-- ============================================================
-- STONE / GST MASTER TABLES
-- ============================================================

CREATE TABLE "GST_STATE_MASTER" (
    "ID"              SMALLINT PRIMARY KEY,
    "STATE_NAME"      VARCHAR(50),
    "STATE_CODE"      VARCHAR(3),
    "COUNTRY"         VARCHAR(30)
);

CREATE TABLE "GST_CODE_MASTER" (
    "ID"              SMALLINT PRIMARY KEY,
    "CODE"            VARCHAR(3),
    "TAXCODE"         VARCHAR(10),
    "SGST"            NUMERIC(5,3),
    "CGST"            NUMERIC(5,3),
    "IGST"            NUMERIC(5,2),
    "UTGST"           SMALLINT DEFAULT 0,
    "Description"     VARCHAR(150)
);

CREATE TABLE "STONE_MASTER" (
    "STONE_CODE"      VARCHAR(2),
    "STONE_SUB"       VARCHAR(3),
    "DESCRIPTION"     VARCHAR(50),
    "UOM"             VARCHAR(5),
    "HSN_CODE"        INTEGER,
    "ACTIVE"          SMALLINT DEFAULT 1,
    PRIMARY KEY ("STONE_CODE", "STONE_SUB")
);

CREATE TABLE "GST_STONE_MASTER_DETL" (
    "STONECODE"       VARCHAR(2),
    "SUBCODE"         VARCHAR(3),
    "SRL"             SMALLINT,
    "FROMDT"          VARCHAR(19),
    "TODT"            VARCHAR(19),
    "HSNCODE"         INTEGER,
    "SGST"            NUMERIC(5,3),
    "CGST"            NUMERIC(5,3),
    "IGST"            NUMERIC(5,2),
    "ISACTIVE"        SMALLINT DEFAULT 1,
    PRIMARY KEY ("STONECODE", "SUBCODE", "SRL"),
    FOREIGN KEY ("STONECODE", "SUBCODE") REFERENCES "STONE_MASTER"("STONE_CODE", "STONE_SUB")
);

CREATE TABLE "PACKET_MASTER" (
    "CODE"            VARCHAR(10) PRIMARY KEY,
    "DESCRIPTION"     VARCHAR(50),
    "STONE_CODE"      VARCHAR(2),
    "STONE_SUB"       VARCHAR(3),
    "ACTIVE"          SMALLINT DEFAULT 1
);

CREATE TABLE "PACKET_MASTER_OPENING" (
    "CODE"            VARCHAR(10),
    "STONE_CODE"      VARCHAR(2),
    "STONE_SUB"       VARCHAR(3),
    "COSTRATE"        NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY ("CODE", "STONE_CODE", "STONE_SUB"),
    FOREIGN KEY ("CODE") REFERENCES "PACKET_MASTER"("CODE")
);

-- ============================================================
-- TRANSACTION TABLES
-- ============================================================

CREATE TABLE "ACCOUNT_TRANS" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "VOUSRL"          VARCHAR(3),
    "VOUDATE"         VARCHAR(19),
    "GL_CODE"         INTEGER REFERENCES "ACCOUNT_MASTER"("GL_CODE"),
    "AMOUNT"          NUMERIC(23,15) DEFAULT 0,
    "BANKDATE"        VARCHAR(10),
    "cbank1"          VARCHAR(1),
    "LOCID"           VARCHAR(2),
    "nullfydata"      VARCHAR(1),
    "ORN_LOCATION"    VARCHAR(2),
    "LINKVOU"         VARCHAR(10),
    "LINKTC"          VARCHAR(3),
    "DeptCode"        VARCHAR(5),
    "CR"              VARCHAR(1),
    "DR"              VARCHAR(1),
    "Transfer"        VARCHAR(1),
    PRIMARY KEY ("TRANCODE", "VOUNUM", "VOUSRL")
);

-- Stone Purchase Header
CREATE TABLE "STONE_PURCHASE" (
    "TRANCODE"        VARCHAR(3) DEFAULT 'ISP',
    "VOUNUM"          VARCHAR(10),
    "VOUDATE"         VARCHAR(19),
    "DEALER_CODE"     VARCHAR(4) REFERENCES "DEALER_MASTER"("CODE"),
    "REF_BILL_NO"     VARCHAR(15),
    "REF_BILL_DATE"   VARCHAR(19),
    "SALESMAN_CODE"   VARCHAR(4) REFERENCES "SALESMAN_MASTER"("CODE"),
    "IS_CUSTOMER"     SMALLINT DEFAULT 0,
    "TOTAL_AMOUNT"    NUMERIC(12,2) DEFAULT 0,
    "DISC_PER"        NUMERIC(5,2) DEFAULT 0,
    "DISC_AMT"        NUMERIC(12,2) DEFAULT 0,
    "TAX_AMT"         NUMERIC(12,2) DEFAULT 0,
    "VAT_PER"         NUMERIC(5,2) DEFAULT 0,
    "VAT_AMT"         NUMERIC(12,2) DEFAULT 0,
    "TCS_TAXABLE_AMT" NUMERIC(12,2) DEFAULT 0,
    "TCS_PER"         NUMERIC(5,2) DEFAULT 1,
    "TCS_AMT"         NUMERIC(12,2) DEFAULT 0,
    "ROUND_OFF"       NUMERIC(8,2) DEFAULT 0,
    "GRAND_TOTAL"     NUMERIC(12,2) DEFAULT 0,
    "NARRATION"       VARCHAR(200),
    "PAN_NO"          VARCHAR(12),
    "LOCID"           VARCHAR(2),
    "TIMEOFSAVE"      VARCHAR(19),
    PRIMARY KEY ("TRANCODE", "VOUNUM")
);

-- Stone Purchase Detail Lines
CREATE TABLE "STONE_TRANS" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "SRL"             SMALLINT,
    "STONE_CODE"      VARCHAR(2),
    "STONE_SUB"       VARCHAR(3),
    "DESCRIPTION"     VARCHAR(50),
    "UOM"             VARCHAR(5),
    "PCS"             INTEGER DEFAULT 0,
    "WEIGHT"          NUMERIC(12,3) DEFAULT 0,
    "RATE"            NUMERIC(12,2) DEFAULT 0,
    "AMOUNT"          NUMERIC(12,2) DEFAULT 0,
    "PACKET_NO"       VARCHAR(10),
    "TAX_AMT"         NUMERIC(12,2) DEFAULT 0,
    "HSNCODE"         INTEGER,
    "CGST"            NUMERIC(5,3) DEFAULT 0,
    "SGST"            NUMERIC(5,3) DEFAULT 0,
    "IGST"            NUMERIC(5,2) DEFAULT 0,
    PRIMARY KEY ("TRANCODE", "VOUNUM", "SRL"),
    FOREIGN KEY ("TRANCODE", "VOUNUM") REFERENCES "STONE_PURCHASE"("TRANCODE", "VOUNUM")
);

-- Payment Lines (Amount Paid By)
CREATE TABLE "CUSTOMER_PAID_AMOUNT" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "SRL"             SMALLINT,
    "GL_CODE"         INTEGER REFERENCES "ACCOUNT_MASTER"("GL_CODE"),
    "CHNO"            VARCHAR(20),
    "CHDATE"          VARCHAR(19),
    "AMOUNT"          NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY ("TRANCODE", "VOUNUM", "SRL"),
    FOREIGN KEY ("TRANCODE", "VOUNUM") REFERENCES "STONE_PURCHASE"("TRANCODE", "VOUNUM")
);

-- Cash Memo (Sales) Header
CREATE TABLE "CASHMEMO_MASTER" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "VOUDATE"         VARCHAR(19),
    "CLIENTSERIAL"    INTEGER,
    "GL_CODE"         INTEGER,
    "ORDERNO"         VARCHAR(10),
    "TOTAL_AMOUNT"    NUMERIC(12,2) DEFAULT 0,
    "DISC_PER"        NUMERIC(5,2) DEFAULT 0,
    "DISC_AMT"        NUMERIC(12,2) DEFAULT 0,
    "TAX_AMT"         NUMERIC(12,2) DEFAULT 0,
    "VAT_PER"         NUMERIC(5,2) DEFAULT 0,
    "VAT_AMT"         NUMERIC(12,2) DEFAULT 0,
    "ROUND_OFF"       NUMERIC(8,2) DEFAULT 0,
    "GRAND_TOTAL"     NUMERIC(12,2) DEFAULT 0,
    "ADJUSTED_AMOUNT" NUMERIC(12,2) DEFAULT 0,
    "NARRATION"       VARCHAR(200),
    "TIMEOFSAVE"      VARCHAR(19),
    "LOCID"           VARCHAR(2),
    PRIMARY KEY ("TRANCODE", "VOUNUM")
);

-- Cash Memo Stone Detail
CREATE TABLE "CASHMEMO_TRANS" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "SRL"             SMALLINT,
    "STONE_CODE"      VARCHAR(2),
    "STONE_SUB"       VARCHAR(3),
    "DESCRIPTION"     VARCHAR(50),
    "UOM"             VARCHAR(5),
    "PCS"             INTEGER DEFAULT 0,
    "WEIGHT"          NUMERIC(12,3) DEFAULT 0,
    "RATE"            NUMERIC(12,2) DEFAULT 0,
    "AMOUNT"          NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY ("TRANCODE", "VOUNUM", "SRL"),
    FOREIGN KEY ("TRANCODE", "VOUNUM") REFERENCES "CASHMEMO_MASTER"("TRANCODE", "VOUNUM")
);

-- ============================================================
-- GST TABLES
-- ============================================================

CREATE TABLE "GST_TAXSUMMARY_DETAIL" (
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "SRL"             SMALLINT,
    "HSNCODE"         INTEGER,
    "CGST_RT"         NUMERIC(5,3) DEFAULT 0,
    "CGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "SGST_RT"         NUMERIC(5,3) DEFAULT 0,
    "SGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "IGST_RT"         NUMERIC(5,2) DEFAULT 0,
    "IGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "CESS"            NUMERIC(12,2) DEFAULT 0,
    "TOT_TAX"         NUMERIC(12,2) DEFAULT 0,
    "TXABAMT"         NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY ("TRANCODE", "VOUNUM", "SRL")
);

CREATE TABLE "GST_PRINT_TAX" (
    "SRL"             SMALLINT,
    "HSN_SSN"         INTEGER,
    "CGST_RT"         NUMERIC(5,3) DEFAULT 0,
    "CGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "SGST_RT"         NUMERIC(5,3) DEFAULT 0,
    "SGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "IGST_RT"         NUMERIC(5,2) DEFAULT 0,
    "IGST_AMT"        NUMERIC(12,2) DEFAULT 0,
    "CESS"            NUMERIC(12,2) DEFAULT 0,
    "TOT_TAX"         NUMERIC(12,2) DEFAULT 0,
    "TXABAMT"         NUMERIC(12,2) DEFAULT 0,
    PRIMARY KEY ("SRL")
);

-- ============================================================
-- AUDIT TRAIL TABLES
-- ============================================================

CREATE TABLE "USER_ADDITION_BY" (
    "ID"              SERIAL PRIMARY KEY,
    "FormCaption"     VARCHAR(50),
    "AddVou"          VARCHAR(10),
    "AddDate"         VARCHAR(19),
    "AddTime"         VARCHAR(10),
    "UserName"        VARCHAR(30)
);

CREATE TABLE "USER_MODIFIED_BY" (
    "ID"              SERIAL PRIMARY KEY,
    "FormCaption"     VARCHAR(50),
    "ModVou"          VARCHAR(10),
    "ModDate"         VARCHAR(19),
    "ModTime"         VARCHAR(10),
    "UserName"        VARCHAR(30)
);

CREATE TABLE "USER_DELETED_BY" (
    "ID"              SERIAL PRIMARY KEY,
    "FormCaption"     VARCHAR(50),
    "DelVou"          VARCHAR(10),
    "DelDate"         VARCHAR(19),
    "DelTime"         VARCHAR(10),
    "UserName"        VARCHAR(30)
);

CREATE TABLE "USER_CANCELLED_BY" (
    "ID"              SERIAL PRIMARY KEY,
    "FormCaption"     VARCHAR(50),
    "CanVou"          VARCHAR(10),
    "CanDate"         VARCHAR(19),
    "CanTime"         VARCHAR(10),
    "UserName"        VARCHAR(30)
);

CREATE TABLE "SMSTRANSACTION" (
    "ID"              SERIAL PRIMARY KEY,
    "TRANCODE"        VARCHAR(3),
    "VOUNUM"          VARCHAR(10),
    "MOBILE"          VARCHAR(15),
    "MESSAGE"         VARCHAR(500),
    "sendsms"         SMALLINT DEFAULT 0,
    "smssenddate"     VARCHAR(19),
    "LOCID"           VARCHAR(2)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_account_master_group   ON "ACCOUNT_MASTER"("ACC_GROUP");
CREATE INDEX idx_account_trans_glcode   ON "ACCOUNT_TRANS"("GL_CODE");
CREATE INDEX idx_account_trans_vounum   ON "ACCOUNT_TRANS"("TRANCODE", "VOUNUM");
CREATE INDEX idx_stone_trans_vounum     ON "STONE_TRANS"("TRANCODE", "VOUNUM");
CREATE INDEX idx_stone_purchase_date    ON "STONE_PURCHASE"("VOUDATE");
CREATE INDEX idx_stone_purchase_dealer  ON "STONE_PURCHASE"("DEALER_CODE");
CREATE INDEX idx_cust_paid_vounum       ON "CUSTOMER_PAID_AMOUNT"("TRANCODE", "VOUNUM");
CREATE INDEX idx_addressbook_glcode     ON "ADDRESSBOOK"("GL_CODE");
CREATE INDEX idx_dealer_glcode          ON "DEALER_MASTER"("GL_CODE");
CREATE INDEX idx_gst_summary_vounum     ON "GST_TAXSUMMARY_DETAIL"("TRANCODE", "VOUNUM");

-- ============================================================
-- SEED: ID_HEADER (Voucher number sequences)
-- ============================================================

INSERT INTO "ID_HEADER" ("TRANCODE", "PREFIX", "CURRENTNO", "DESCRIPTION") VALUES
('ISP', 'SP',   0, 'Stone Purchase'),
('RSP', 'SPR',  0, 'Stone Purchase Return'),
('INS', 'CM',   0, 'Cash Memo Sale'),
('RNS', 'CMR',  0, 'Cash Memo Return'),
('ORD', 'OR',   0, 'Order'),
('PMT', 'PM',   0, 'Payment'),
('RCP', 'RC',   0, 'Receipt'),
('JOU', 'JV',   0, 'Journal Voucher'),
('CNT', 'CN',   0, 'Contra'),
('INP', 'NP',   0, 'New Gold Purchase'),
('RNP', 'NPR',  0, 'New Gold Purchase Return');

INSERT INTO "SERIAL_INFO" ("TRANCODE", "PRINT_STATUS", "TSAVE", "PasswordActive") VALUES
('ISP', 0, 1, 0),
('INS', 0, 1, 0),
('ORD', 0, 1, 0);
