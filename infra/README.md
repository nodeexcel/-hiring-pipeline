# infra

- `docker-compose.piston.yml` + `piston-install.sh`: default sandboxed code runner.
- `docker-compose.judge0.yml` + `judge0.conf`: alternative runner for cgroup v1 Linux hosts.
  Judge0 1.13.1 fails with "Failed to create control group /sys/fs/cgroup/memory/box-0/"
  on cgroup v2 (Docker Desktop for Mac/Windows, recent Linux).
- Safe Exam Browser: download the starter config from `GET /api/seb-config`, open it in
  SEB Config Tool, save, copy the **Config Key** into Admin → Cutoffs.
