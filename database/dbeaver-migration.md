# DBeaver Migration Guide: MS Access MDB → PostgreSQL

## Step 1 — Set Up PostgreSQL Database

1. Open DBeaver → **Database** → **New Connection** → choose **PostgreSQL**
2. Fill in connection details:
   - Host: `localhost`
   - Port: `5432`
   - Database: `jewellery_db`
   - Username: `postgres`
   - Password: *(your pg password)*
3. Click **Test Connection** → **Finish**

## Step 2 — Create the Schema

1. In DBeaver, right-click your PostgreSQL connection → **SQL Editor** → **Open SQL Script**
2. Open the file `database/schema.sql` from this project
3. Press **Ctrl+A** to select all, then **Ctrl+Enter** to execute
4. All tables are now created with exact column names

## Step 3 — Connect to MS Access MDB Files

DBeaver uses the **UCanAccess** JDBC driver to connect to .mdb files.

### 3a — Download UCanAccess Driver
1. In DBeaver: **Database** → **Driver Manager** → click **New**
2. Driver Name: `MS Access (UCanAccess)`
3. Driver Type: `Generic`
4. Click **Add File** and add these JARs (download from https://ucanaccess.sourceforge.net/):
   - `ucanaccess-5.0.1.jar`
   - `commons-lang3-3.8.1.jar`
   - `commons-logging-1.2.jar`
   - `hsqldb-2.5.0.jar`
   - `jackcess-3.0.1.jar`
5. URL Template: `jdbc:ucanaccess://{file}`
6. Click **OK**

### 3b — Connect to WINGOLD.mdb
1. **Database** → **New Connection** → select `MS Access (UCanAccess)`
2. File path: `d:\UtkalLabs\jewellery_app\jewellery_app\WINGOLD.mdb`
3. Click **Test** → **Finish**

Repeat for:
- `Customer.mdb` → connect separately
- `TRANS.MDB.MDB` → connect separately

## Step 4 — Transfer Data Table by Table

For each MDB table:

1. In the MS Access connection tree, find the table
2. Right-click → **Export Data**
3. Choose **Database** as target
4. Select your **PostgreSQL jewellery_db** connection
5. Map the table name (see mapping table below)
6. Click **Proceed**

### Table Name Mapping (MDB → PostgreSQL)

| MDB Source Table | PostgreSQL Target Table | MDB File |
|---|---|---|
| ACCOUNT_GROUP | ACCOUNT_GROUP | WINGOLD.mdb |
| ACCOUNT_MASTER | ACCOUNT_MASTER | WINGOLD.mdb |
| ACCOUNT_TRANS | ACCOUNT_TRANS | WINGOLD.mdb |
| DEALER_MASTER | DEALER_MASTER | WINGOLD.mdb |
| SALESMAN_MASTER | SALESMAN_MASTER | WINGOLD.mdb |
| ARTISAN_MASTER | ARTISAN_MASTER | WINGOLD.mdb |
| STONE_MASTER | STONE_MASTER | WINGOLD.mdb |
| GST_STONE_MASTER_DETL | GST_STONE_MASTER_DETL | WINGOLD.mdb |
| GST_CODE_MASTER | GST_CODE_MASTER | WINGOLD.mdb |
| GST_STATE_MASTER | GST_STATE_MASTER | WINGOLD.mdb |
| GST_TAXSUMMARY_DETAIL | GST_TAXSUMMARY_DETAIL | WINGOLD.mdb |
| PACKET_MASTER | PACKET_MASTER | WINGOLD.mdb |
| PACKET_MASTER_OPENING | PACKET_MASTER_OPENING | WINGOLD.mdb |
| STONE_TRANS | STONE_TRANS | WINGOLD.mdb |
| STONE_PURCHASE (or equiv) | STONE_PURCHASE | WINGOLD.mdb |
| CASHMEMO_MASTER | CASHMEMO_MASTER | WINGOLD.mdb |
| CASHMEMO_TRANS | CASHMEMO_TRANS | WINGOLD.mdb |
| CUSTOMER_PAID_AMOUNT | CUSTOMER_PAID_AMOUNT | WINGOLD.mdb |
| SETUP_INFO | SETUP_INFO | WINGOLD.mdb |
| SETUP_INFO2 | SETUP_INFO2 | WINGOLD.mdb |
| SERIAL_INFO | SERIAL_INFO | WINGOLD.mdb |
| ID_HEADER | ID_HEADER | WINGOLD.mdb |
| TC_WISE_PASSWORD_DETAIL | TC_WISE_PASSWORD_DETAIL | WINGOLD.mdb |
| BRANCH_MASTER | BRANCH_MASTER | WINGOLD.mdb |
| YEARLIST | YEARLIST | WINGOLD.mdb |
| ADDRESSBOOK | ADDRESSBOOK | Customer.mdb |
| SMSTRANSACTION | SMSTRANSACTION | TRANS.MDB |
| USER_ADDITION_BY | USER_ADDITION_BY | TRANS.MDB |
| USER_MODIFIED_BY | USER_MODIFIED_BY | TRANS.MDB |
| USER_DELETED_BY | USER_DELETED_BY | TRANS.MDB |
| USER_CANCELLED_BY | USER_CANCELLED_BY | TRANS.MDB |

## Step 5 — Alternative: Import from XLSX Files

If MDB connection fails, use the exported XLSX files in `database/sample/`:

1. Right-click the target PostgreSQL table → **Import Data**
2. Choose **CSV/XLSX** as source
3. Select the matching `.xlsx` file from `database/sample/`
4. DBeaver auto-maps columns by name (they match exactly)
5. Click **Proceed**

### Column mapping note
The xlsx files and PostgreSQL schema use identical column names (UPPERCASE).
DBeaver will match them automatically — no manual mapping needed.

## Step 6 — Verify Migration

Run these verification queries in DBeaver SQL Editor:

```sql
-- Check record counts
SELECT 'ACCOUNT_GROUP'   AS tbl, COUNT(*) FROM "ACCOUNT_GROUP"
UNION ALL SELECT 'ACCOUNT_MASTER',  COUNT(*) FROM "ACCOUNT_MASTER"
UNION ALL SELECT 'ACCOUNT_TRANS',   COUNT(*) FROM "ACCOUNT_TRANS"
UNION ALL SELECT 'DEALER_MASTER',   COUNT(*) FROM "DEALER_MASTER"
UNION ALL SELECT 'STONE_TRANS',     COUNT(*) FROM "STONE_TRANS"
ORDER BY tbl;

-- Verify account hierarchy integrity
SELECT am."GL_CODE", am."ACC_NAME", ag."ACC_NAME" AS group_name
FROM "ACCOUNT_MASTER" am
JOIN "ACCOUNT_GROUP" ag ON am."ACC_GROUP" = ag."ACC_GROUP"
LIMIT 20;

-- Verify stone purchase data
SELECT sp."VOUNUM", sp."VOUDATE", sp."DEALER_CODE", sp."GRAND_TOTAL",
       COUNT(st."SRL") AS stone_lines
FROM "STONE_PURCHASE" sp
LEFT JOIN "STONE_TRANS" st ON sp."TRANCODE" = st."TRANCODE" AND sp."VOUNUM" = st."VOUNUM"
GROUP BY sp."VOUNUM", sp."VOUDATE", sp."DEALER_CODE", sp."GRAND_TOTAL"
ORDER BY sp."VOUNUM";
```

## Step 7 — Create Application User

```sql
-- Create a dedicated app user (don't use postgres superuser in production)
CREATE USER jewellery_app WITH PASSWORD 'your_secure_password';
GRANT CONNECT ON DATABASE jewellery_db TO jewellery_app;
GRANT USAGE ON SCHEMA public TO jewellery_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jewellery_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jewellery_app;
```

Update `backend/.env`:
```
DATABASE_URL="postgresql://jewellery_app:your_secure_password@localhost:5432/jewellery_db"
```
