from sqlalchemy import BigInteger, Integer

# 主键/外键 ID 类型：
# - PostgreSQL 等保持 BigInteger
# - SQLite 使用 Integer，确保 PRIMARY KEY 可自动生成 rowid
IDType = BigInteger().with_variant(Integer, "sqlite")

