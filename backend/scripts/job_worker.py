"""
简单的后台任务 worker。

用法：
  python -m scripts.job_worker
  python -m scripts.job_worker --once
"""
import argparse
import logging
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.core.logging import configure_logging
from app.services.job_queue import run_next_pending_job


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="只执行一个待处理任务后退出")
    args = parser.parse_args()

    configure_logging(settings.debug)
    logger = logging.getLogger("job_worker")
    logger.info("后台任务 worker 启动 poll=%s", settings.job_worker_poll_seconds)

    while True:
        job = run_next_pending_job()
        if job:
            logger.info("后台任务完成 job_id=%s type=%s status=%s", job.id, job.job_type, job.status)
            if args.once:
                return 0
            continue
        if args.once:
            return 0
        time.sleep(max(1, settings.job_worker_poll_seconds))


if __name__ == "__main__":
    raise SystemExit(main())
