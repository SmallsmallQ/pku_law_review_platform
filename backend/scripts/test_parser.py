from app.services.parser import parse_manuscript
import os
from pathlib import Path

# 创建一个临时 docx 文件进行测试（如果本地没有合适的测试文件）
def test_parsing():
    print("Testing parser...")
    # 这里我们只打印解析器是否能正常导入和基本逻辑
    # 实际测试需要真实文件
    try:
        res = parse_manuscript("dummy.txt")
        print("Parser dummy test OK:", res["title"])
    except Exception as e:
        print("Parser failed:", e)

if __name__ == "__main__":
    test_parsing()
